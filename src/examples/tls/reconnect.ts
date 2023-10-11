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
import * as FS from 'node:fs';

function processClient(client: LwDFX.IConnection): Promise<void> {

    console.log(`[${new Date().toISOString()}] Connection[${client.localAddress}:${client.localPort}->${client.remoteAddress}:${client.remotePort}] connected using ${client.alpName}`);
    const data = new Array(3).fill(Buffer.from(JSON.stringify({ action: 'GetMyName' })));
    const msgInterval = Math.random() * 1000;
    const byeTimeout = 30000 * (Math.random() + 1);
    const msgTimer = setInterval(() => {

        try {

            client.write(data);
        }
        catch (e) {

            console.error(e);
        }

    }, msgInterval);

    let isClosedLocally = false;

    const byeTimer = setTimeout(() => {

        isClosedLocally = true;
        console.log(`[${new Date().toISOString()}] Close connection locally`);
        client.end();

    }, byeTimeout);

    console.log(`[${new Date().toISOString()}] Send message every ${msgInterval}ms`);
    console.log(`[${new Date().toISOString()}] Close connection in ${byeTimeout}ms`);

    client.on('frame', (frameChunks) => {

        console.log(`[${new Date().toISOString()}] Recv frame:  ${Buffer.concat(frameChunks).toString()}`);
    });

    client.on('error', (e) => {

        console.error(e);
    });

    client.on('close', () => {

        client.removeAllListeners();
        clearInterval(msgTimer);
        if (!isClosedLocally) {

            console.log(`[${new Date().toISOString()}] Connection closed by remote`);
        }
    });

    return new Promise((resolve) => {

        client.on('close', () => {
            clearTimeout(byeTimer);
            resolve();
        });
    });
}

(async () => {

    do {

        try {

            const client = await LwDFX.Tls.connect({
                alpWhitelist: ['demo', 'b2'],
                hostname: process.argv[2] ?? '127.0.0.1',
                port: parseInt(process.argv[3] ?? '9330'),
                tlsOptions: {
                    ca: [FS.readFileSync(`${__dirname}/../../temp/ca.pem`, 'utf-8')],
                    servername: process.argv[4] ?? 'lwdfx-tls-server',
                }
            });

            await processClient(client);

        }
        catch (e) {

            console.error(e);
            await new Promise(resolve => setTimeout(resolve, Math.ceil(1000 * Math.random())));
        }

    } while (1);

})().catch(console.error);
