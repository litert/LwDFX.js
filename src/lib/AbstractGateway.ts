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

import type * as D from './Decl';
import * as $Events from 'node:events';
import { ServerConnection } from './ServerConnection';

export abstract class AbstractGateway extends $Events.EventEmitter {

    protected _conns: Record<string, D.IConnection> = {};

    public constructor(
        protected readonly _server: D.IServer
    ) {

        super();
    }

    public abstract start(): Promise<void>;

    public abstract stop(): Promise<void>;

    protected _saveConnection(conn: ServerConnection): void {

        this._conns[conn.id] = conn.on('close', () => {
            delete this._conns[conn.id];
        });
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

}
