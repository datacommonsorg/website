/**
 * Copyright 2022 Google LLC
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

import { PropertyValue } from "../shared/types";
/**
 * Types specific to event pages
 */
export interface Property {
  // Stores all values of a single property of an event.
  // You can think of this as representing edges to other nodes (values)
  // with the same label (dcid).
  dcid: string;
  values: Array<PropertyValue>;
}
