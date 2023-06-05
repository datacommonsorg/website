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

/**
 * Utils for processing and formatting property values from API calls.
 */

import { formatNumber } from "../i18n/i18n";
import { Node, PropertyValues } from "../shared/api_response_types";

/**
 * Returns the first property in a list with any of the given dcids.
 */
export function findProperty(
  dcids: string[],
  properties: PropertyValues
): Node[] {
  for (const k of dcids) {
    if (k in properties) {
      return properties[k];
    }
  }
  return undefined;
}

/**
 * Returns the first display value of the property.
 */
export function getValue(property: Node[]): string {
  if (!property || !property.length) {
    return "";
  }
  return property[0].dcid || property[0].value;
}

/**
 * Formats the raw property value string from an API call as a number with unit.
 */
export function formatPropertyValue(val: string): string {
  if (!val) {
    return "";
  }

  // If value is a date, pass through without a unit.
  if (!isNaN(Date.parse(val))) {
    return val;
  }
  const numIndex = val.search(/-?[0-9]/);
  if (numIndex < 0) {
    return val;
  }
  let unit = val.substring(0, numIndex);
  if (unit) {
    unit = unit.trim();
  }
  const num = Number.parseFloat(val.substring(numIndex));
  return formatNumber(num, unit);
}

/**
 * Formats the first display value of a property value node as a number with unit.
 */
export function formatPropertyNodeValue(property: Node[]): string {
  const val = getValue(property);
  if (!val) {
    return "";
  }
  return formatPropertyValue(val);
}

/**
 * Parses a lat,long pair from the first value of a property value node.
 */
export function parseLatLong(property: Node[]): [number, number] {
  if (!property || !property.length) return null;
  const val = property[0];
  if (val.name) {
    const latLong = val.name.split(",").map((f) => parseFloat(f));
    console.assert(latLong.length == 2);
    return [latLong[0], latLong[1]];
  }
  return null;
}

/**
 * Strips the unit from a numeric property value, returning just the number.
 * Expects values formatted as "Unit 1.2345".
 */
export function stripUnitFromPropertyValue(value: string): number {
  const numIndex = value.search(/-?[0-9]/);
  if (numIndex < 0) {
    return Number.NaN;
  }
  return Number.parseFloat(value.substring(numIndex));
}
