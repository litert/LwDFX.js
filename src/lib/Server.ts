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

import type * as D from './Decl';
import * as C from './Constant';
import * as $Net from 'node:net';
import * as $Events from 'node:events';
import { ServerConnection } from './ServerConnection';
import { LwDFXError } from './Errors';

export type ICreateServerOptions = Partial<Pick<
    D.IServer,
    'alpWhitelist' | 'maxConnections' | 'timeout' | 'handshakeTimeout' | 'maxFrameSize'
>>;

function createIdGenerator(): () => number {

    let nextId = Date.now();

    return () => {

        return nextId++;
    };
}

class LwDFXServer extends $Events.EventEmitter implements D.IServer {

    private _conns: Record<string, D.IConnection> = {};

    private readonly _generateNextId = createIdGenerator();

    public constructor(
        public alpWhitelist: string[],
        public maxConnections: number,
        private _timeout: number,
        public handshakeTimeout: number,
        public maxFrameSize: number,
    ) {

        super();
    }

    public get timeout(): number {

        return this._timeout;
    }

    public set timeout(v: number) {

        if (!Number.isSafeInteger(v) || v < 0) {

            throw new LwDFXError('invalid_timeout', 'Invalid timeout value.');
        }

        this._timeout = v;
    }

    public get connections(): number {

        return Object.keys(this._conns).length;
    }

    public closeAll(): void {

        for (const k in this._conns) {

            try {

                this._conns[k].end();
            }
            catch (e) {

                this.emit('error', e);
            }
        }

        this._conns = {};
    }

    public registerConnection(socket: $Net.Socket): void {

        if (this.connections >= this.maxConnections) {

            this.emit('error', new LwDFXError('conn_max_out', 'Too many connections'));

            socket.destroy();
            return;
        }

        const conn = new ServerConnection(this._generateNextId(), socket, this._timeout, this.maxFrameSize);

        conn.setup(this.alpWhitelist, this.handshakeTimeout, (err) => {

            if (err) {

                this.emit('error', err);
                return;
            }

            this._conns[conn.id] = conn;

            this.emit('connection', conn);
            conn.on('close', () => {

                delete this._conns[conn.id];
            });
        });
    }
}

/**
 * Create a new LwDFX server instance.
 *
 * @param opts  Options to use for the server.
 */
export function createServer(opts: ICreateServerOptions = {}): D.IServer {

    return new LwDFXServer(
        opts.alpWhitelist ?? C.DEFAULT_ALP_WHITELIST,
        opts.maxConnections ?? C.DEFAULT_MAX_CONNECTIONS,
        opts.timeout ?? C.DEFAULT_TIMEOUT,
        opts.handshakeTimeout ?? C.DEFAULT_HANDSHAKE_TIMEOUT,
        opts.maxFrameSize ?? C.DEFAULT_MAX_FRAME_SIZE
    );
}
