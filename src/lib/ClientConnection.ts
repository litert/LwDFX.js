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

import * as C from './Constant';
import * as D from './Decl';
import { AbstractConnection } from './AbstractConnection';
import { LwDFXError } from './Errors';

export class ClientConnection extends AbstractConnection implements D.IConnection {

    protected _handshake(
        alpNames: readonly string[],
        callback: D.IErrorCallback<unknown>,
    ): void {

        this._sendClientHello(alpNames);

        this._socket!.on('data', (chunk) => {

            if (chunk.byteLength < 10) {

                callback(new LwDFXError('invalid_packet', 'Invalid handshake packet'));
                this._socket!.destroy();
                return;
            }

            const packetSize = chunk.readUint32LE(0);

            if (chunk.byteLength < packetSize) {

                callback(new LwDFXError('invalid_packet', 'Invalid handshake packet header size'));
                this._socket?.destroy();
                return;
            }

            if (chunk.readUint32LE(4) !== C.SERVER_HELLO_MAGIC) {

                callback(new LwDFXError('invalid_packet', 'Invalid handshake packet header magic'));
                this._socket?.destroy();
                return;
            }

            this._enc.maxFrameSize = chunk.readUint32LE(8);

            if (chunk[12] !== C.VERSION_1) {

                callback(new LwDFXError('invalid_version', 'No compatible version offered'));
                this._socket?.destroy();
                return;
            }

            this.alpName = chunk.toString('utf8', 14, 14 + chunk[13]);

            if (!this.alpName || (alpNames.length && !alpNames.includes(this.alpName))) {

                callback(new LwDFXError('invalid_alp', 'No compatible ALP name offered'));
                this._socket?.destroy();
                return;
            }

            callback(null);

            this._processHelloTailingChunk(packetSize, chunk);
        });
    }

    private _sendClientHello(alpNames: readonly string[]): void {

        if (!this._socket?.writable) {

            return;
        }

        const alpLengthList = alpNames.map(i => Buffer.byteLength(i));
        const frame = Buffer.allocUnsafe(11 + alpLengthList.length + alpLengthList.reduce((a, b) => a + b, 0));

        frame.writeUInt32LE(frame.byteLength, 0);
        frame.writeUInt32LE(C.CLIENT_HELLO_MAGIC, 4);
        frame.writeUInt8(1, 8);
        frame.writeUInt8(C.VERSION_1, 9);
        frame.writeUInt8(alpLengthList.length, 10);

        for (let i = 0, offset = 11; i < alpLengthList.length; i++) {

            frame.writeUInt8(alpLengthList[i], offset++);
            frame.write(alpNames[i], offset, alpLengthList[i], 'utf8');

            offset += alpLengthList[i];
        }

        this._socket.write(frame);
    }
}
