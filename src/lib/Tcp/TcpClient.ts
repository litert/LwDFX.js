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
import * as Constants from './../Constant';
import * as D from './../Decl';
import * as C from './TcpCommon';
import { ClientConnection } from '../ClientConnection';
import { LwDFXError } from '../Errors';

export interface ITcpClientOptions extends D.IConnectOptions {

    /**
     * The hostname the server is listening on.
     *
     * @type string
     * @default 'localhost'
     */
    hostname?: string;

    /**
     * The port number the server is listening on.
     *
     * > Set to 0 to have the operating system assign a random port.
     *
     * @type uint16
     * @default 8698
     */
    port?: number;

    /**
     * The existing socket to use.
     *
     * > If the socket is specified, `hostname` and `port` are ignored.
     *
     * > Only available at the first time connecting.
     *
     * @default null
     */
    socket?: $Net.Socket | D.ISocketFactory | null;
}

function netConnect(opts: ITcpClientOptions): Promise<$Net.Socket> {

    return new Promise<$Net.Socket>((resolve, reject) => {

        if (typeof opts.socket === 'function') {

            opts.socket().then(resolve, reject);
            return;
        }

        if (!(opts.socket?.closed ?? true)) {

            resolve(opts.socket!);
            return;
        }

        const socket = $Net.connect({
            'host': opts.hostname ?? C.DEFAULT_HOSTNAME,
            'port': opts.port ?? C.DEFAULT_PORT,
            'timeout': opts.handshakeTimeout ?? Constants.DEFAULT_HANDSHAKE_TIMEOUT,
        }, () => {

            socket.removeAllListeners('error');

            socket.removeAllListeners('connect');

            resolve(socket);
        });

        socket.on('error', (e) => {

            socket.removeAllListeners('error');

            socket.removeAllListeners('connect');

            reject(new LwDFXError('connect_error', 'Failed to connect to remote server', e));
        });
    });
}

/**
 * Connect to a LwDFX server through TCP protocol.
 *
 * @param opts      Connection options.
 * @param callback  Callback function.
 */
export async function connect(opts: ITcpClientOptions): Promise<D.IConnection> {

    const socket = await netConnect(opts);

    return new Promise<D.IConnection>((resolve, reject) => {

        const conn = new ClientConnection(
            socket,
            opts.timeout ?? Constants.DEFAULT_TIMEOUT,
        );

        conn.setup(
            opts.alpWhitelist ?? Constants.DEFAULT_ALP_WHITELIST,
            opts.handshakeTimeout ?? Constants.DEFAULT_HANDSHAKE_TIMEOUT,
            (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(conn);
                }
            }
        );
    });
}
