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

import type * as D from './../Decl';
import * as $Net from 'node:net';
import { LwDFXError } from './../Errors';
import * as C from './TcpCommon';
import { AbstractGateway } from '../AbstractGateway';
import { ServerConnection } from '../ServerConnection';

export type ITcpGatewayOptions = Partial<Pick<
    ITcpGateway,
    'backlog' | 'hostname' | 'port'
>>;

export interface ITcpGateway {

    /**
     * The hostname the gateway is listening on.
     *
     * @type string
     * @default 'localhost'
     */
    hostname: string;

    /**
     * The port number the gateway is listening on.
     *
     * > Set to 0 to have the operating system assign a random port.
     *
     * @type uint16
     * @default 8698
     */
    port: number;

    /**
     * The maximum length of the queue of pending connections.
     *
     * @type uint32
     * @default 1023
     */
    backlog: number;

    /**
     * Tells whether the gateway is running or not.
     */
    readonly running: boolean;

    /**
     * Register a callback function to be called when the gateway starts listening or closes.
     *
     * @param event     The event name.
     * @param callback  The callback function.
     */
    on(event: 'listening' | 'close', callback: () => void): this;

    /**
     * Register a callback function to be called when the gateway gets an error.
     *
     * > The event should always be listened, otherwise the error will be thrown out and program may crash.
     *
     * @param event     The event name.
     * @param callback  The callback function.
     */
    on(event: 'error', callback: (err: unknown) => void): this;

    /**
     * Remove all listeners, or those of the specified event.
     *
     * @param event     The event name. When omitted, all listeners for all events will be removed.
     */
    removeAllListeners(event?: 'error' | 'listening' | 'close'): this;

    /**
     * Start the gateway.
     *
     * > If the gateway is already running, this method will do nothing.
     * >
     * > When a gateway starts listening successfully, the `listening` event will be emitted.
     */
    start(): Promise<void>;

    /**
     * Close all connections and stop the gateway
     *
     * > If the gateway is not running, this method will do nothing.
     * >
     * > When a gateway stops listening successfully, the `close` event will be emitted.
     */
    stop(): Promise<void>;
}

class TcpGateway4LwDFX extends AbstractGateway implements ITcpGateway {

    private _gateway: $Net.Server | null = null;

    public constructor(
        private _hostname: string,
        private _port: number,
        private _backlog: number,
        server: D.IServer
    ) {

        super(server);
    }

    public get hostname(): string {

        return this._hostname;
    }

    public set hostname(value: string) {

        if (this.running) {

            throw new LwDFXError('gateway_busy', 'Cannot change hostname while running');
        }

        this._hostname = value;
    }

    public get port(): number {

        return this._port;
    }

    public set port(value: number) {

        if (this.running) {

            throw new LwDFXError('gateway_busy', 'Cannot change port while running');
        }

        this._port = value;
    }

    public get backlog(): number {

        return this._backlog;
    }

    public set backlog(value: number) {

        if (this.running) {

            throw new LwDFXError('gateway_busy', 'Cannot change backlog while running');
        }

        this._backlog = value;
    }

    public get running(): boolean {

        return this._gateway !== null;
    }

    public start(): Promise<void> {

        if (this._gateway) {

            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {

            const server = $Net.createServer();

            server.on('error', (err) => {

                reject(err);
            });

            server.on('listening', () => {

                this._gateway = server;
                server.removeAllListeners('error');
                server.on('connection', (socket) => {

                    this._server.registerConnection(socket, (err, conn?) => {

                        if (err) {

                            if (!socket.closed) {
                                socket.destroy();
                            }
                            return;
                        }

                        this._saveConnection(conn as ServerConnection);
                    });

                });
                server.on('error', (err) => { this.emit('error', err); });

                this.emit('listening');
                resolve();
            });

            server.listen(this._port, this._hostname, this._backlog);
        });
    }

    public stop(): Promise<void> {

        if (!this._gateway) {

            return Promise.resolve();
        }

        const server = this._gateway;
        this._gateway = null;

        this.closeAll();

        return new Promise((resolve) => {

            server.close(() => {

                this.emit('close');
                resolve();
            });
        });
    }
}

/**
 * Create a new TCP gateway for LwDFX.
 *
 * @param opts  Options of the gateway
 */
export function createGateway(server: D.IServer, opts: ITcpGatewayOptions = {}): ITcpGateway {

    return new TcpGateway4LwDFX(
        opts.hostname ?? C.DEFAULT_HOSTNAME,
        opts.port ?? C.DEFAULT_PORT,
        opts.backlog ?? C.DEFAULT_BACKLOG,
        server,
    );
}
