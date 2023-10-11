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

import * as $Net from 'node:net';
import * as C from './Constant';
import * as D from './Decl';
import { AbstractConnection } from './AbstractConnection';
import { LwDFXError } from './Errors';

const FRAME_SERVER_HELLO_REJECT_VERSION = Buffer.allocUnsafe(15);

FRAME_SERVER_HELLO_REJECT_VERSION.writeUInt32LE(FRAME_SERVER_HELLO_REJECT_VERSION.byteLength, 0);
FRAME_SERVER_HELLO_REJECT_VERSION.writeUint32LE(C.SERVER_HELLO_MAGIC, 4);
FRAME_SERVER_HELLO_REJECT_VERSION.writeUint32LE(0, 8);
FRAME_SERVER_HELLO_REJECT_VERSION.writeUint8(C.NO_VERSION, 12);
FRAME_SERVER_HELLO_REJECT_VERSION.writeUint16LE(0, 13);

const FRAME_SERVER_HELLO_REJECT_ALP = Buffer.allocUnsafe(15);

FRAME_SERVER_HELLO_REJECT_ALP.writeUInt32LE(FRAME_SERVER_HELLO_REJECT_ALP.byteLength, 0);
FRAME_SERVER_HELLO_REJECT_ALP.writeUint32LE(C.SERVER_HELLO_MAGIC, 4);
FRAME_SERVER_HELLO_REJECT_VERSION.writeUint32LE(0, 8);
FRAME_SERVER_HELLO_REJECT_VERSION.writeUint8(C.VERSION_1, 12);
FRAME_SERVER_HELLO_REJECT_VERSION.writeUint16LE(0, 13);

const PREFERRED_VERSION_NOT_FOUND = 0xFFFF;

export class ServerConnection extends AbstractConnection implements D.IConnection {

    public constructor(
        public readonly id: number,
        socket: $Net.Socket,
        timeout: number,
        maxFrameSize: number,
    ) {

        super(socket, timeout);

        this._enc.maxFrameSize = maxFrameSize;
    }

    protected _handshake(
        alpWhitelist: readonly string[],
        callback: D.IErrorCallback<unknown>,
    ): void {

        this._socket!.on('data', (chunk) => {

            if (chunk.byteLength < 10) {

                callback(new LwDFXError('invalid_packet', 'Invalid handshake packet'));
                this._socket?.destroy();
                return;
            }

            const packetSize = chunk.readUint32LE(0);

            if (chunk.byteLength < packetSize) {

                callback(new LwDFXError('invalid_packet', 'Invalid handshake packet header size'));
                this._socket?.destroy();
                return;
            }

            if (chunk.readUint32LE(4) !== C.CLIENT_HELLO_MAGIC) {

                callback(new LwDFXError('invalid_packet', 'Invalid handshake packet header magic'));
                this._socket?.destroy();
                return;
            }

            const availableVersions = chunk.subarray(9, chunk.readUint8(8) + 9);

            if (availableVersions.byteLength === 0) {

                callback(new LwDFXError('invalid_version', 'No available versions offered'));
                this._sendServerHelloRejectedVersion();
                this._socket?.destroy();
                return;
            }

            if (availableVersions.indexOf(C.VERSION_1) === -1) {

                callback(new LwDFXError('invalid_version', 'No compatible version offered'));
                this._sendServerHelloRejectedVersion();
                this._socket?.destroy();
                return;
            }

            let offset = availableVersions.byteLength + 9;
            const clientAlpQty = chunk.readUint8(offset++);

            if (clientAlpQty === 0) {

                /**
                 * If neither server nor client offers ALP names, reject the connection.
                 */
                if (alpWhitelist.length === 0) {

                    callback(new LwDFXError('invalid_alp', 'No ALP name offered by client'));
                    this._sendServerHelloRejectedAlp();
                    this._socket?.destroy();
                    return;
                }

                /**
                 * If server offers ALP names but client doesn't, use the first one in server's list.
                 */
                this.alpName = alpWhitelist[0];
            }
            else {

                let preferredAlp = PREFERRED_VERSION_NOT_FOUND;

                for (let i = 0; i < clientAlpQty; i++) {

                    const sLen = chunk.readUint8(offset++);

                    if (sLen === 0 || offset + sLen > packetSize) {

                        callback(new LwDFXError('invalid_alp', 'Invalid ALP name'));
                        this._sendServerHelloRejectedAlp();
                        return;
                    }

                    const alpName = chunk.toString('utf8', offset, offset + sLen);

                    offset += sLen;

                    if (alpWhitelist.length === 0) {

                        alpWhitelist = [alpName];
                        preferredAlp = 0;
                        break;
                    }

                    const alpPos = alpWhitelist.indexOf(alpName);

                    if (alpPos !== -1 && alpPos < preferredAlp) {

                        preferredAlp = alpPos;
                    }
                }

                if (preferredAlp === PREFERRED_VERSION_NOT_FOUND) {

                    callback(new LwDFXError('invalid_alp', 'No compatible ALP name offered'));
                    this._sendServerHelloRejectedAlp();
                    return;
                }

                this.alpName = alpWhitelist[preferredAlp];
            }

            this._sendServerHelloOk(1, this.alpName);

            callback(null);

            this._processHelloTailingChunk(packetSize, chunk);
        });
    }

    private _sendServerHelloRejectedVersion(): void {

        if (!this._socket?.writable) {

            return;
        }

        this._socket.write(FRAME_SERVER_HELLO_REJECT_VERSION);
        this._socket.destroy();
    }

    private _sendServerHelloRejectedAlp(): void {

        if (!this._socket?.writable) {

            return;
        }

        this._socket.write(FRAME_SERVER_HELLO_REJECT_ALP);
        this._socket.destroy();
    }

    private _sendServerHelloOk(version: number, alpName: string): void {

        if (!this._socket?.writable) {

            return;
        }

        const alpLength = Buffer.byteLength(alpName);
        const frame = Buffer.allocUnsafe(14 + alpLength);

        frame.writeUInt32LE(frame.byteLength, 0);
        frame.writeUInt32LE(C.SERVER_HELLO_MAGIC, 4);
        frame.writeUInt32LE(this._enc.maxFrameSize, 8);
        frame.writeUInt8(version, 12);
        frame.writeUInt8(alpLength, 13);
        frame.write(alpName, 14, alpLength, 'utf8');

        this._socket.write(frame);
    }
}
