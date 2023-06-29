/**
 * Copyright 2023 Google LLC
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

/** Library of helper functions shared across web components */

/**
 * Custom attribute converter for Array<String> type attributes
 * Models the behavior of the default Lit attribute value converter, but
 * removes the requirement to use double quotes within a list.
 * @param attributeValue the attribute value provided to the web component
 * @returns JSON parsed list of strings
 */
export function convertArrayAttribute(attributeValue: string): string[] {
  // JSON.parse requires double quotes for strings within objects.
  const cleanedAttributeValue = attributeValue.replaceAll("'", '"');
  return JSON.parse(cleanedAttributeValue);
}
