import * as Assert from 'node:assert';
import * as LwDFX from '../lib';

describe('Decoding', function(): void {

    describe('Data frame', function(): void {

        it('Zero-length data frame should be decoded as empty array', function(): void {

            const enc = new LwDFX.LwDFXEncoder();

            enc.maxFrameSize = 0x10000;

            Assert.deepEqual(enc.decode(enc.encodeHeader(0)), [[]]);
        });

        it('Data frame followed by insufficient content should always return an empty array', function(): void {

            const enc = new LwDFX.LwDFXEncoder();

            enc.maxFrameSize = 0x10000;

            const b1 = Buffer.allocUnsafe(1);

            Assert.deepEqual(enc.decode(enc.encodeHeader(18)), []);

            for (let i = 0; i < 17; i++) {

                Assert.deepEqual(enc.decode(b1), []);
            }

            Assert.deepEqual(enc.decode(b1), [new Array(18).fill(b1)]);
        });

        it('Data frame followed by an exactly sufficient content should be decoded as chunks', function(): void {

            const enc = new LwDFX.LwDFXEncoder();

            enc.maxFrameSize = 0x10000;

            const b = Buffer.allocUnsafe(16);

            Assert.deepEqual(enc.decode(enc.encodeHeader(16)), []);
            Assert.deepEqual(enc.decode(b), [[b]]);
        });

        it('Data frame followed by chunked exactly sufficient content should be decoded as chunks', function(): void {

            const enc = new LwDFX.LwDFXEncoder();

            enc.maxFrameSize = 0x10000;

            const b1 = Buffer.allocUnsafe(16);
            const b2 = Buffer.allocUnsafe(2);

            Assert.deepEqual(enc.decode(enc.encodeHeader(18)), []);
            Assert.deepEqual(enc.decode(b1), []);
            Assert.deepEqual(enc.decode(b2), [[b1, b2]]);
        });

        it('Tow sticked data frames in one buffer should be decoded into two chunks', function(): void {

            const enc = new LwDFX.LwDFXEncoder();

            enc.maxFrameSize = 0x10000;

            const tmp = Buffer.concat([
                enc.encodeHeader(18),
                Buffer.allocUnsafe(18),
            ]);

            const frames = Buffer.concat([tmp, tmp]);

            Assert.deepEqual(enc.decode(frames), [[tmp.subarray(8)], [tmp.subarray(8)]]);
        });

        it('Decoded frames byte by byte should be ok', function(): void {

            const enc = new LwDFX.LwDFXEncoder();

            enc.maxFrameSize = 0x10000;

            const singleFrame = Buffer.concat([
                enc.encodeHeader(8),
                Buffer.allocUnsafe(8),
            ]);

            const frames = Buffer.concat([singleFrame, singleFrame]);

            for (let i = 0; i < frames.byteLength; i++) {

                const t = enc.decode(frames.subarray(i, i + 1));

                if ((i + 1) % singleFrame.byteLength === 0) {

                    Assert.equal(
                        Buffer.concat(t[0]).toString('hex'),
                        singleFrame.subarray(8).toString('hex')
                    );
                }
                else {

                    Assert.deepEqual(t, []);
                }
            }

            for (let i = 0; i < frames.byteLength; i += 2) {

                const t = enc.decode(frames.subarray(i, i + 2));

                if ((i + 2) % singleFrame.byteLength === 0) {

                    Assert.equal(
                        Buffer.concat(t[0]).toString('hex'),
                        singleFrame.subarray(8).toString('hex')
                    );
                }
                else {

                    Assert.deepEqual(t, []);
                }
            }
        });
    });
});
