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

import * as $Net from 'node:net';
import * as Constants from './../Constant';
import * as D from './../Decl';
import * as C from './TcpCommon';
import { ClientConnection } from '../ClientConnection';

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
     * @default null
     */
    socket?: $Net.Socket | null;
}

/**
 * Connect to a LwDFX server.
 *
 * @param opts      Connection options.
 * @param callback  Callback function.
 */
export function connect(opts: ITcpClientOptions): Promise<D.IConnection> {

    return new Promise<D.IConnection>((resolve, reject) => {

        if (opts.socket) {

            const connection = new ClientConnection(opts.socket, opts.timeout ?? Constants.DEFAULT_TIMEOUT);

            connection.setup(
                opts.alpWhitelist ?? Constants.DEFAULT_ALP_WHITELIST,
                opts.handshakeTimeout ?? Constants.DEFAULT_HANDSHAKE_TIMEOUT,
                (err) => {

                    if (err) {

                        reject(err);
                        return;
                    }

                    resolve(connection);
                }
            );

            return;
        }

        const socket = $Net.connect({
            'host': opts.hostname ?? C.DEFAULT_HOSTNAME,
            'port': opts.port ?? C.DEFAULT_PORT,
            'timeout': opts.handshakeTimeout ?? Constants.DEFAULT_HANDSHAKE_TIMEOUT,
        });

        socket.on('connect', () => {

            socket.removeAllListeners('error');

            const connection = new ClientConnection(socket, opts.timeout ?? Constants.DEFAULT_TIMEOUT);

            connection.setup(
                opts.alpWhitelist ?? Constants.DEFAULT_ALP_WHITELIST,
                opts.handshakeTimeout ?? Constants.DEFAULT_HANDSHAKE_TIMEOUT,
                (err) => {

                    if (err) {

                        reject(err);
                        return;
                    }

                    resolve(connection);
                }
            );
        });

        socket.on('error', (e) => {

            socket.destroy();
            reject(e);
        });
    });
}
