/**
 * Copyright 2023 Angus.Fenying <fenying@litert.org>
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
});

const tcpGateway = LwDFX.Tcp.createGateway(server);

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

    conn.on('frame', (frameChunks) => {

        const data = Buffer.concat(frameChunks);
        console.log('frame', data.toString());
        conn.write(data);
    });

    conn.on('error', (err) => {

        console.error('Connection error', err);
    });

    conn.on('close', () => {

        // clearInterval(timer);
        console.log(`Connection[${conn.remoteAddress}:${conn.remotePort}->${conn.localAddress}:${conn.localPort}] closed`);
    });
});

tcpGateway.start()
    .then(() => {
        console.info('Server started');
    }, (e) => {
        console.error('Server failed to start', e);
    });
