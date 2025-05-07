/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * `inert` disables interaction with an element and removes it from the
 * accessibility tree.
 *
 * This is not available to the typing of earlier versions of React and
 * so is added in here.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

declare module "react" {
  interface HTMLAttributes<T> {
    inert?: boolean | "" | undefined;
  }
}

export {};

/* eslint-enable @typescript-eslint/no-unused-vars */
