/**
 * Copyright 2023 Angus.Fenying <fenying@litert.org>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as $Net from 'node:net';
import * as $Events from 'node:events';
import * as D from './Decl';
import { LwBFDecoder } from './Decoder';
import { LwDFXError } from './Errors';

const CLOSE_FRAME = Buffer.from([0x00, 0x00, 0x00, 0x00]);

export abstract class AbstractConnection extends $Events.EventEmitter implements D.IConnection {

    public readonly remoteAddress: string;

    public readonly remotePort: number;

    public readonly localAddress: string;

    public readonly localPort: number;

    protected readonly _decoder = new LwBFDecoder();

    public alpName: string = '';

    public get connected(): boolean {

        return !this._socket.closed;
    }

    public constructor(
        protected _socket: $Net.Socket,
        public timeout: number
    ) {

        super();

        this.remoteAddress = _socket.remoteAddress!;
        this.remotePort = _socket.remotePort!;
        this.localAddress = _socket.localAddress!;
        this.localPort = _socket.localPort!;
    }

    public write(buf: Buffer): boolean {

        const header = Buffer.allocUnsafe(4);

        header.writeUInt32LE(buf.byteLength, 0);

        return this._socket.write(header) && this._socket.write(buf);
    }

    public end(): boolean {

        if (this._socket.writable) {

            try {

                this._socket.end(CLOSE_FRAME);
            }
            catch {

                return false;
            }

            return true;
        }

        return false;
    }

    public destroy(): void {

        this._socket.destroy();
    }

    protected _once<T extends (...args: any[]) => unknown>(callback: T): T {

        let cb: T | null = callback;
        let result!: unknown;

        return function(...args: any[]): unknown {

            if (cb) {

                result = cb(...args);

                cb = null;
            }

            return result;

        } as T;
    }

    protected _setupSocket(): void {

        this._socket.removeAllListeners();

        this._socket.setTimeout(this.timeout, () => {

            this._socket.destroy(new LwDFXError('timeout', 'Connection timeout'));
        });

        this._socket.on('close', () => {

            this.emit('close');
        });

        this._socket.on('error', (err) => {

            this.emit('error', err);
        });

        this._socket.on('end', () => {

            this.emit('end');
        });

        this._socket.on('data', (d) => {

            try {

                const frames = this._decoder.decode(d);

                for (const f of frames) {

                    this.emit('frame', f);
                }
            }
            catch (e) {

                this.emit('error', e);
                this.destroy();
            }
        });
    }

    protected abstract _handshake(
        alpWhitelist: readonly string[],
        callback: D.IErrorCallback<unknown>,
    ): void;

    protected _processHelloTailingChunk(helloPacketSize: number, chunk: Buffer): void {

        if (chunk.byteLength > helloPacketSize) {

            try {

                const frames = this._decoder.decode(chunk.subarray(helloPacketSize));

                for (const f of frames) {

                    this.emit('frame', f);
                }
            }
            catch (e) {

                this.emit('error', e);
                this.destroy();
            }
        }
    }

    public setup(
        alpWhitelist: readonly string[],
        handshakeTimeout: number,
        callback: D.IErrorCallback<D.IConnection>,
    ): void {

        const sendResult = this._once(callback);

        const timer = setTimeout(() => {

            sendResult(new LwDFXError('timeout', 'Handshake timeout'));

        }, handshakeTimeout);

        this._socket.setTimeout(handshakeTimeout, () => {
            this._socket.destroy(new LwDFXError('timeout', 'Handshake timeout'));
        });

        this._socket.on('close', () => {

            sendResult(new LwDFXError('conn_lost', 'Connection closed'));

            clearTimeout(timer);

            this._socket.removeAllListeners();
        });

        this._socket.on('error', (err) => {

            sendResult(err);

            clearTimeout(timer);

            this._socket.removeAllListeners();
        });

        this._handshake(alpWhitelist, (err) => {

            if (err) {

                sendResult(err);
                return;
            }

            clearTimeout(timer);

            this._setupSocket();

            sendResult(null, this);
        });
    }
}
