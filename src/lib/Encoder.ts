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

import { LwDFXError } from './Errors';
import * as Constants from './Constant';

export class LwDFXEncoder {

    private _lenBufOffset = 0;

    private _frameRest = 0;

    private readonly _headerBuf: Buffer = Buffer.allocUnsafe(8);

    private _buffer: Buffer[] = [];

    public maxFrameSize: number = 0;

    public encodeHeader(len: number, buf: Buffer = Buffer.allocUnsafe(Constants.DATA_FRAME_HEADER_LEN)): Buffer {

        if (len > this.maxFrameSize) {

            throw new LwDFXError('encode_error', 'Too large frame');
        }

        buf.writeUInt32LE(Constants.DATA_FRAME_MAGIC, 0);
        buf.writeUInt32LE(len, 4);

        return buf;
    }

    public decode(data: Buffer): Buffer[][] {

        const ret: Buffer[][] = [];

        while (data.byteLength > 0) {

            if (this._frameRest) {

                const bytes2Read = Math.min(this._frameRest, data.byteLength);

                this._buffer.push(data.subarray(0, bytes2Read));

                this._frameRest -= bytes2Read;

                data = data.subarray(bytes2Read);

                if (this._frameRest === 0) {

                    this._lenBufOffset = 0;

                    ret.push(this._buffer);

                    this._buffer = [];
                }

                continue;
            }

            const bytes2Read = Math.min(Constants.DATA_FRAME_HEADER_LEN - this._lenBufOffset, data.byteLength);

            data.copy(this._headerBuf, this._lenBufOffset, 0, bytes2Read);

            this._lenBufOffset += bytes2Read;

            data = data.subarray(bytes2Read);

            if (this._lenBufOffset === Constants.DATA_FRAME_HEADER_LEN) {

                if (this._headerBuf.readUInt32LE(0) !== Constants.DATA_FRAME_MAGIC) {

                    throw new LwDFXError('decode_error', 'Invalid data frame');
                }

                this._frameRest = this._headerBuf.readUInt32LE(4);

                if (this._frameRest === 0) {

                    ret.push([]);

                    break;
                }

                if (this._frameRest > this.maxFrameSize) {

                    throw new LwDFXError('decode_error', 'Too large frame');
                }
            }
        }

        return ret;
    }
}
