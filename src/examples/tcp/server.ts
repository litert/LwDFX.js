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

const server = LwDFX.createServer({
    alpWhitelist: ['b1', 'b2'],
    maxFrameSize: 1024,
    timeout: 500,
});

const tcpGateway = LwDFX.Tcp.createGateway(server, {
    port: parseInt(process.argv[3] ?? '8698'),
    hostname: process.argv[2] ?? '0.0.0.0',
});

tcpGateway.on('close', () => {

    console.info('Server closed');
});

server.on('error', (err) => {

    console.error('Server error', err);
});

tcpGateway.on('error', (err) => {

    console.error('Gateway error', err);
});

server.on('connection', (conn) => {

    console.log(`Connection[${conn.remoteAddress}:${conn.remotePort}->${conn.localAddress}:${conn.localPort}] connected using ${conn.alpName}`);

    const msgTimer = setInterval(() => {

        try {
            conn.write('Hello');
        }
        catch (e) {
            console.error(e);
        }
    }, Math.ceil(1000 * Math.random()) + 10);
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
        setTimeout(() => { clearInterval(msgTimer); }, 1000);
        console.log(`Connection closed`);
    });
});

tcpGateway.start()
    .then(() => {
        console.info('Server started');
    }, (e) => {
        console.error('Server failed to start', e);
    });
