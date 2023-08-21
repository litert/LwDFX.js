import * as Assert from 'node:assert';
import * as LwDFX from '../lib';

describe('Encoding', function(): void {

    describe('Data frame', function(): void {

        it('Frame header magic should be 0x86989330', function(): void {

            Assert.equal(LwDFX.Constants.DATA_FRAME_MAGIC, 0x86989330);
        });

        it('Frame header should be size of 8-byte', function(): void {

            Assert.equal(LwDFX.Constants.DATA_FRAME_HEADER_LEN, 8);

            const enc = new LwDFX.LwDFXEncoder();

            enc.maxFrameSize = 0x10000;

            Assert.equal(enc.encodeHeader(1234).byteLength, 8);
        });

        it('Frame header magic should be written in little-endian', function(): void {

            const enc = new LwDFX.LwDFXEncoder();

            enc.maxFrameSize = 0x10000;

            Assert.equal(enc.encodeHeader(1234).readUInt32LE(0), LwDFX.Constants.DATA_FRAME_MAGIC);
        });

        it('Frame length should be written in little-endian', function(): void {

            const enc = new LwDFX.LwDFXEncoder();

            enc.maxFrameSize = 0x10000;

            Assert.equal(enc.encodeHeader(0x1234).readUInt32LE(4), 0x1234);
            Assert.notEqual(enc.encodeHeader(0x1234).readUInt32BE(4), 0x1234);
        });

        it('Should throw error when frame length is larger than the max size', function(): void {

            const enc = new LwDFX.LwDFXEncoder();

            enc.maxFrameSize = 0x10000;

            Assert.doesNotThrow(function(): void {

                enc.encodeHeader(0xFFFF);
                enc.encodeHeader(0x10000);
            });

            Assert.throws(function(): void {

                enc.encodeHeader(0x10001);
            });
        });
    });
});
