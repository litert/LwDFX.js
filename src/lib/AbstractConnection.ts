/**
 * Copyright 2023 Angus.Fenying <i@fenying.net>
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

import type * as $Net from 'node:net';
import * as $Events from 'node:events';
import * as D from './Decl';
import { LwDFXError } from './Errors';
import { LwDFXEncoder } from './Encoder';

const CLOSE_FRAME = Buffer.from([0x00, 0x00, 0x00, 0x00]);

function once<T extends (...args: any[]) => unknown>(callback: T): T {

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

export abstract class AbstractConnection extends $Events.EventEmitter implements D.IConnection {

    protected readonly _enc = new LwDFXEncoder();

    public alpName: string = '';

    protected _socket: $Net.Socket | null;

    public constructor(
        socket: $Net.Socket,
        public timeout: number
    ) {

        super();

        this._socket = socket;

        socket.setNoDelay(true);
    }

    public get finished(): boolean {

        return this._socket?.writableFinished ?? true;
    }

    public get ended(): boolean {

        return this._socket?.readableEnded ?? true;
    }

    public get connected(): boolean {

        return this._socket?.closed === false;
    }

    public get writable(): boolean {

        return this._socket?.writable === true;
    }

    public get family(): string {

        return this._socket?.localFamily ?? '';
    }

    public get remoteAddress(): string {

        return this._socket?.remoteAddress ?? '';
    }

    public get localAddress(): string {

        return this._socket?.localAddress ?? '';
    }

    public get remotePort(): number {

        return this._socket?.remotePort ?? 0;
    }

    public get localPort(): number {

        return this._socket?.localPort ?? 0;
    }

    public write(frameChunks: Buffer | string | Array<Buffer | string>): boolean {

        if (!this.connected || !this._socket?.writable) {

            throw new LwDFXError('conn_lost', 'Connection lost');
        }

        if (frameChunks instanceof Buffer) {

            this._socket.write(this._enc.encodeHeader(frameChunks.byteLength));

            return this._socket.write(frameChunks);
        }

        if (!Array.isArray(frameChunks)) {

            this._socket.write(this._enc.encodeHeader(Buffer.byteLength(frameChunks)));

            return this._socket.write(frameChunks);
        }

        this._socket.write(this._enc.encodeHeader(frameChunks.reduce((s, c) => s + Buffer.byteLength(c), 0)));

        let ret: boolean = true;

        for (const chunk of frameChunks) {

            ret = this._socket.write(chunk);
        }

        return ret;
    }

    public end(): boolean {

        if (this._socket?.writable) {

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

        this._socket?.destroy();
    }

    protected _setupSocket(): void {

        if (!this.connected) {

            throw new LwDFXError('conn_lost', 'Connection lost');
        }

        this._socket!
            .removeAllListeners()
            .setTimeout(this.timeout, () => {

                this._socket?.destroy(new LwDFXError('timeout', 'Connection timeout'));
            })
            .on('close', () => {

                this._socket = null;
                this.emit('close');
            })
            .on('error', (err) => this.emit('error', err))
            .on('end', () => this.emit('end'))
            .on('finish', () => this.emit('finish'))
            .on('data', (d) => {

                try {

                    const frames = this._enc.decode(d);

                    for (const chunks of frames) {

                        this.emit('frame', chunks);
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

                const frames = this._enc.decode(chunk.subarray(helloPacketSize));

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

        callback = once(callback);

        const timer = setTimeout(() => {

            callback(new LwDFXError('timeout', 'Handshake timeout'));

        }, handshakeTimeout);

        this._socket!.setTimeout(handshakeTimeout, () => {

            this._socket!.destroy(new LwDFXError('timeout', 'Handshake timeout'));
        });

        this._socket!.on('close', () => {

            callback(new LwDFXError('conn_lost', 'Connection closed'));

            clearTimeout(timer);

            this._socket?.removeAllListeners();
            this._socket = null;
        });

        this._socket!.on('error', (err) => {

            callback(err);
            this.destroy();
        });

        this._handshake(alpWhitelist, (err) => {

            if (err) {

                callback(err);
                return;
            }

            clearTimeout(timer);

            this._setupSocket();

            callback(null, this);
        });
    }
}
