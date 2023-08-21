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

import type * as $Net from 'node:net';

export interface IErrorCallback<T> {

    (err: unknown): void;

    (err: null, value: T): void;
}

export interface IConnection {

    /**
     * The application layer protocol name of the connection.
     */
    readonly alpName: string;

    /**
     * The remote address of the connection.
     */
    readonly remoteAddress: string;

    /**
     * The remote port of the connection.
     */
    readonly remotePort: number;

    /**
     * The local address of the connection.
     */
    readonly localAddress: string;

    /**
     * The local port of the connection.
     */
    readonly localPort: number;

    /**
     * Tell whether the connection is connected.
     */
    readonly connected: boolean;

    /**
     * Register a callback for the `frame` event.
     *
     * @param event         The event name.
     * @param callback      The callback function with a single parameter `frameChunks`, which is a chunks array of a single frame in order.
     */
    on(event: 'frame', callback: (frameChunks: Buffer[]) => void): this;

    /**
     * Register a callback for the `close` event.
     *
     * @param event         The event name.
     * @param callback      The callback function with an optional parameter `e`, which is the error that caused the connection to close.
     */
    on(event: 'close', callback: (e?: unknown) => void): this;

    /**
     * Register a callback for the `end` event.
     *
     * @param event     The event name.
     * @param callback  The callback function.
     */
    on(event: 'end', callback: () => void): this;

    /**
     * Register a callback for the `error` event.
     *
     * > The event should always be listened, otherwise the error will be thrown out and program may crash.
     *
     * @param event     The event name.
     * @param callback  The callback function with a single parameter `err`, which is the error info.
     */
    on(event: 'error', callback: (err: unknown) => void): this;

    /**
     * Remove all listeners, or those of the specified event.
     *
     * @param event     The event name. When omitted, all listeners for all events will be removed.
     */
    removeAllListeners(event?: 'error' | 'end' | 'close' | 'frame'): this;

    /**
     * Write a frame to the connection.
     *
     * @param frameChunks     The chunks of a frame to write.
     */
    write(frameChunks: Buffer | Buffer[]): boolean;

    /**
     * Close the connection.
     */
    end(): boolean;

    /**
     * Force closing the connection.
     */
    destroy(): void;
}

export interface IConnectOptions {

    /**
     * The application layer protocol whitelist.
     *
     * > If neither server nor client specifies the whitelist, the server will deny client connections.
     * >
     * > If server specifies the whitelist, but client does not, the server will choose the first protocol in its whitelist.
     * >
     * > If client specifies the whitelist, but server does not, the server will choose the first protocol in the client's whitelist.
     * >
     * > Thus, the order of the list represents the priority of the protocols the server prefers. The first
     * > protocol in the list is the most preferred, the last is the least preferred.
     * >
     * > During the handshake, server will check each protocol offered by the client in order, and
     * > select the server most preferred one.
     *
     * @type string[]
     * @default []
     */
    alpWhitelist?: string[];

    /**
     * The timeout in milliseconds for the connections.
     *
     * > Set to `0` to disable the timeout.
     *
     * @default 60000
     * @type uint32
     */
    timeout?: number;

    /**
     * The timeout in milliseconds for the handshake process.
     *
     * > Set to `0` to disable the timeout.
     *
     * @default 30000
     * @type uint32
     */
    handshakeTimeout?: number;
}

export interface IServer {

    /**
     * The maximum number of connections allowed to be connected to the server.
     *
     * > Could be changed after the server is created, and even after the server is started.
     *
     * @type uint32
     * @default 1023
     */
    maxConnections: number;

    /**
     * The application layer protocol whitelist.
     *
     * > If neither server nor client specifies the whitelist, the server will deny client connections.
     * >
     * > If server specifies the whitelist, but client does not, the server will choose the first protocol in its whitelist.
     * >
     * > If client specifies the whitelist, but server does not, the server will choose the first protocol in the client's whitelist.
     * >
     * > Thus, the order of the list represents the priority of the protocols the server prefers. The first
     * > protocol in the list is the most preferred, the last is the least preferred.
     * >
     * > During the handshake, server will check each protocol offered by the client in order, and
     * > select the server most preferred one.
     *
     * @type string[]
     * @default []
     */
    alpWhitelist: string[];

    /**
     * The timeout in milliseconds for the connections.
     *
     * > Set to `0` to disable the timeout.
     *
     * @default 60000
     * @type uint32
     */
    timeout: number;

    /**
     * The timeout in milliseconds for the handshake process.
     *
     * > Set to `0` to disable the timeout.
     *
     * @default 30000
     * @type uint32
     */
    handshakeTimeout: number;

    /**
     * The maximum size of each frame, in bytes.
     *
     * @default 67108864 (64 MiB)
     * @type uint32
     */
    maxFrameSize: number;

    /**
     * The number of connections currently connected to the server.
     */
    readonly connections: number;

    /**
     * Register a callback function to be called when the server gets a new connection.
     *
     * @param event     The event name.
     * @param callback  The callback function.
     */
    on(event: 'connection', callback: (conn: IConnection) => void): this;

    /**
     * Register a callback function to be called when the server gets an error.
     *
     * > The event should always be listened, otherwise the error will be thrown out and program may crash.
     *
     * @param event     The event name.
     * @param callback  The callback function.
     */
    on(event: 'error', callback: (err: unknown) => void): this;

    /**
     * Close all connections.
     */
    closeAll(): void;

    /**
     * Remove all listeners, or those of the specified event.
     *
     * @param event     The event name. When omitted, all listeners for all events will be removed.
     */
    removeAllListeners(event?: 'error' | 'connection'): this;

    /**
     * Register a connection to the server.
     *
     * @param conn  The connection to be registered.
     */
    registerConnection(conn: $Net.Socket, callback: IErrorCallback<IConnection>): void;
}
