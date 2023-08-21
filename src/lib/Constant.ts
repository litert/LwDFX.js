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
 * The default value of ALP whitelist.
 *
 * @type string[]
 */
export const DEFAULT_ALP_WHITELIST: string[] = [];

/**
 * The default max number of connections.
 *
 * @type uint32
 */
export const DEFAULT_MAX_CONNECTIONS: number = 1023;

/**
 * The default timeout of a connection.
 *
 * @type uint32
 */
export const DEFAULT_TIMEOUT: number = 60_000;

/**
 * The default handshake timeout of a connection.
 *
 * @type uint32
 */
export const DEFAULT_HANDSHAKE_TIMEOUT: number = 30_000;

/**
 * The default max frame size of a connection.
 *
 * @type uint32
 */
export const DEFAULT_MAX_FRAME_SIZE: number = 67108864; // 64 MiB

/**
 * The CLIENT_HELLO packet magic constant of LwDFX v1.
 *
 * @type uint32
 */
export const CLIENT_HELLO_MAGIC: number = 0x5446424c;

/**
 * The SERVER_HELLO packet magic constant of LwDFX v1.
 *
 * @type uint32
 */
export const SERVER_HELLO_MAGIC: number = 0x5446424d;

/**
 * The constant of LwDFX v1.
 *
 * @type uint8
 */
export const VERSION_1: number = 0x01;

/**
 * The constant of no version.
 *
 * @type uint8
 */
export const NO_VERSION: number = 0xFF;

/**
 * The length of data frame header, in bytes.
 *
 * @type uint32
 */
export const DATA_FRAME_HEADER_LEN = 8;

/**
 * The magic of data frame header.
 *
 * @type uint32
 */
export const DATA_FRAME_MAGIC = 0x86989330;
