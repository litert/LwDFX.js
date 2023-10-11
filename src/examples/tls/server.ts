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

const server = LwDFX.createServer({
    alpWhitelist: ['b1', 'b2'],
    maxFrameSize: 1024,
});

const gateway = LwDFX.Tls.createGateway(server, {
    hostname: process.argv[2] ?? '127.0.0.1',
    port: parseInt(process.argv[3] ?? '9330'),
    tlsOptions: {
        cert: FS.readFileSync(`${__dirname}/../../temp/newcerts/server-lwdfx-tls-server.fullchain.pem`, 'utf-8'),
        key: FS.readFileSync(`${__dirname}/../../temp/private/server-lwdfx-tls-server.key.pem`, 'utf-8'),
    }
});

gateway.on('close', () => {

    console.info('Server closed');
});

server.on('error', (err) => {

    console.error('Server error', err);
});

gateway.on('error', (err) => {

    console.error('Gateway error', err);
});

server.on('connection', (conn) => {

    console.log(`Connection[${conn.remoteAddress}:${conn.remotePort}->${conn.localAddress}:${conn.localPort}] connected using ${conn.alpName}`);

    conn.on('frame', (frameChunks) => {

        console.log(`[${new Date().toISOString()}] Recv frame:  ${Buffer.concat(frameChunks).toString()}`);
        try {
            conn.write(frameChunks);
        }
        catch (e) {
            console.error(e);
        }
    });

    conn.on('error', (err) => {

        console.error('Connection error', err);
    });

    const byeTimeout = 10000 * Math.random();

    const timer = setTimeout(() => {

        try {

            conn.write(Buffer.from('bye~'));
        }
        catch (e) {

            console.error(e);
        }
        conn.end();
    }, byeTimeout);

    console.log(`[${new Date().toISOString()}] Close connection in ${byeTimeout}ms`);

    conn.on('close', () => {

        clearTimeout(timer);
        console.log(`Connection closed`);
    });
});

gateway.start()
    .then(() => {
        console.info('Server started');
    }, (e) => {
        console.error('Server failed to start', e);
    });
