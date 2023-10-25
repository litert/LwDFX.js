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

/**
 * The default port of LwDFXv1 over TLS.
 *
 * @type uint16
 */
export const DEFAULT_PORT: number = 9330;

/**
 * The default listening hostname of LwDFXv1 over TLS.
 *
 * @type string
 */
export const DEFAULT_HOSTNAME: string = 'localhost';

/**
 * The default backlog of LwDFXv1 over TLS.
 *
 * @type uint32
 */
export const DEFAULT_BACKLOG: number = 1023;

/**
 * The default TLS ALPN protocol of LwDFXv1.
 */
export const DEFAULT_ALPN_PROTOCOL: string = 'lwdfx1';

/**
 * The default timeout for connecting to the server, in milliseconds.
 *
 * @type uint32
 */
export const DEFAULT_CONNECT_TIMEOUT: number = 30_000;
