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

import * as LwDFX from '../../lib';

(async () => {

    const conn = await LwDFX.Tcp.connect({ alpWhitelist: ['demo', 'b2'] });

    console.log(`Connection[${conn.localAddress}:${conn.localPort}->${conn.remoteAddress}:${conn.remotePort}] connected using ${conn.alpName}`);
    const data = new Array(3).fill(Buffer.from(JSON.stringify({ action: 'GetMyName' })));
    const timer = setInterval(() => {

        conn.write(data);

    }, 1000);

    conn.on('frame', (frameChunks) => {

        console.log('frame', Buffer.concat(frameChunks).toString());
    });

    conn.on('error', (e) => {

        console.error(e);
    });

    conn.on('close', () => {

        clearInterval(timer);
        console.log(`Connection[${conn.localAddress}:${conn.localPort}->${conn.remoteAddress}:${conn.remotePort}] closed`);
    });

})().catch(console.error);
