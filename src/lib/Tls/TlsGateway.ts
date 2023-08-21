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

import type * as D from './../Decl';
import * as $Tls from 'node:tls';
import { LwDFXError } from './../Errors';
import * as C from './TlsCommon';
import { ServerConnection } from '../ServerConnection';
import { AbstractGateway } from '../AbstractGateway';

export interface ITlsGatewayOptions extends Partial<Pick<
    ITlsGateway,
    'backlog' | 'hostname' | 'port'
>> {

    /**
     * The TLS secure context options.
     */
    tlsOptions: $Tls.SecureContextOptions;
}

export interface ITlsGateway {

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
     * @default 9330
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
     * Set the TLS secure context options.
     */
    setTlsOptions(opts: $Tls.SecureContextOptions): this;

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

class TlsGateway4LwDFX extends AbstractGateway implements ITlsGateway {

    private _gateway: $Tls.Server | null = null;

    public constructor(
        private _hostname: string,
        private _port: number,
        private _backlog: number,
        private _tlsOptions: $Tls.SecureContextOptions,
        server: D.IServer
    ) {

        super(server);
    }

    public setTlsOptions(opts: $Tls.SecureContextOptions): this {

        if (this.running) {

            throw new LwDFXError('gateway_busy', 'Cannot change TLS options while running');
        }

        this._tlsOptions = opts;

        return this;
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

            const tlsListener = $Tls.createServer({
                ALPNProtocols: [C.DEFAULT_ALPN_PROTOCOL],
                ...this._tlsOptions,
            });

            tlsListener.on('error', (err) => {

                reject(err);
            });

            tlsListener.on('listening', () => {

                this._setupGateway(tlsListener);

                this.emit('listening');
                resolve();
            });

            tlsListener.listen(this._port, this._hostname, this._backlog);
        });
    }

    private _setupGateway(tlsListener: $Tls.Server): void {

        this._gateway = tlsListener;

        tlsListener.removeAllListeners('error');

        tlsListener.on('secureConnection', (socket) => {

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

        tlsListener.on('error', (err) => { this.emit('error', err); });
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
 * Create a new TLS gateway for LwDFX.
 *
 * @param opts  Options of the gateway
 */
export function createGateway(server: D.IServer, opts: ITlsGatewayOptions): ITlsGateway {

    return new TlsGateway4LwDFX(
        opts.hostname ?? C.DEFAULT_HOSTNAME,
        opts.port ?? C.DEFAULT_PORT,
        opts.backlog ?? C.DEFAULT_BACKLOG,
        opts.tlsOptions,
        server,
    );
}
