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
 * The error class for LwDFX.
 */
export class LwDFXError {

    public readonly stack!: string;

    public constructor(
        public readonly name: string,
        public readonly message: string,
        public readonly origin: unknown = null
    ) {

        Error.captureStackTrace(this, LwDFXError);
    }

    public toString(): string {

        return this.stack;
    }
}
