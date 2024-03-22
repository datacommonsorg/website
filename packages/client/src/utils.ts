/**
 * Copyright 2024 Google LLC
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

import _ from "lodash";
import { DEFAULT_FIELD_DELIMITER } from "./data_commons_client";
import {
  DataRow,
  EntityGroupedDataRow,
  QuotientObservation,
} from "./data_commons_client_types";
import { Observation } from "./data_commons_web_client_types";

/**
 * Converts an object to URLSearchParams.
 *
 * Example:
 *
 * Input:
 * `{
 *   "string_key": "string_value",
 *   "number_key": 123,
 *   "string_arr_key": ["value1", "value2"]
 * }`
 *
 * Returns a URLSearchParams object with the equivalent query string:
 * `string_key=string_value&number_key=123&string_arr_key=value1&string_arr_key=value2`
 *
 * @param obj object to convert URLSearchParams
 * @returns URLSearchParams object
 */
export const toURLSearchParams = (
  obj: Record<string, string | string[] | number | null | undefined>
) => {
  const urlSearchParams = new URLSearchParams();
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined || obj[key] === null) {
      return;
    }
    if (typeof obj[key] == "object") {
      const values = obj[key] as string[];
      values.forEach((value) => {
        urlSearchParams.append(key, value);
      });
      return;
    }
    urlSearchParams.append(key, String(obj[key]));
  });
  // Sort search params for easier unit testing query string comparisons
  urlSearchParams.sort();
  return urlSearchParams;
};

/**
 * Encodes an array to a valid CSV row. Replaces double quotes with double-double quotes (`" -> ""`)
 *
 * Example: `["String one", 'String "two"', 123, null, true]`
 * Returns: `"String one","String ""two""",123,null,true`
 * @param items array of strings, numbers, booleans, etc.
 * @returns CSV row
 */
export function encodeCsvRow(items: any[]): string {
  return items
    .map((item) => {
      if (typeof item === "string") {
        // Quote strings and replace all double quotes (") with double-double quotes ("")
        return `"${item.replace(/"/g, '""')}"`;
      }
      return String(item);
    })
    .join(",");
}

/**
 * Given a observation series `num`, computes the ratio of the each
 * observation value in `num` to the observation value in `denom` with
 * the closest date value.
 *
 * Both `num` and `denom` series are sorted ascending by date.
 *
 * @param num Sorted numerator observation series.
 * @param denom Sorted denominator time series.
 * @param scaling Scale denominator by dividing by this amount
 *
 * @returns A list of Observations with the per capita calculation applied to its values.
 */
export function computeRatio(
  num: Observation[],
  denom: Observation[],
  scaling = 1
): QuotientObservation[] {
  if (_.isEmpty(denom)) {
    return [];
  }
  const result: QuotientObservation[] = [];
  let j = 0; // denominator position
  for (let i = 0; i < num.length; i++) {
    const numDate = Date.parse(num[i].date);
    const denomDate = Date.parse(denom[j].date);
    // Walk through the denom array to find entry with the closest date
    while (j < denom.length - 1 && numDate > denomDate) {
      const denomDateNext = Date.parse(denom[j + 1].date);
      const nextBetter =
        Math.abs(denomDateNext - numDate) < Math.abs(denomDate - numDate);
      if (nextBetter) {
        j++;
      } else {
        break;
      }
    }
    let quotientValue: number;
    if (denom[j].value == 0) {
      quotientValue = 0;
    } else {
      quotientValue = num[i].value / denom[j].value / scaling;
    }
    result.push({
      ...denom[j],
      quotientValue,
    });
  }
  return result;
}

/**
 * Flattens a nested JavaScript object to a single level if key/values.
 * Combines keys using the specified delimiter
 *
 * Example:
 * object = {
 *   key1 : {
 *     key2 : "key2value"
 *   },
 *   arrayKey : [
 *     {
 *       arrayItem: "arrayItem1Value"
 *     },
 *     {
 *       arrayItem: "arrayItem2Value"
 *     }
 *   ]
 * }
 * delimiter = "."
 *
 * Result:
 * {
 *   "key1.key2": "key2value",
 *   "arrayKey.0.arrayItem": "arrayItem1Value",
 *   "arrayKey.1.arrayItem": "arrayItem2Value"
 * }
 */
export function flattenNestedObject(
  object: any,
  delimiter: string = "."
): Record<string, string | number | boolean> {
  const resultObject: Record<string, string | number | boolean> = {};
  const helper = (keyParts: string[], value: any) => {
    if (value !== null && typeof value === "object" && _.isEmpty(value)) {
      // Exclude empty objects and empty arrays
      return;
    } else if (Array.isArray(value)) {
      value.forEach((subValue, index) => {
        helper([...keyParts, `${index}`], subValue);
      });
    } else if (value !== null && typeof value === "object") {
      Object.keys(value).forEach((key) => {
        helper([...keyParts, key], value[key]);
      });
    } else {
      resultObject[keyParts.join(delimiter)] = value;
    }
  };

  Object.keys(object).forEach((key) => {
    helper([key], object[key]);
  });
  return resultObject;
}

/**
 * Converts the passed in data rows to a CSV string.
 * Flattens data row structure using the specified file delimiter.
 *
 * @param dataRows Data rows
 * @param fieldDelimiter Delimiter for flattening nested data row items
 * @returns
 */
export function dataRowsToCsv(
  dataRows: DataRow[] | EntityGroupedDataRow[],
  fieldDelimiter: string = DEFAULT_FIELD_DELIMITER
) {
  if (dataRows.length === 0) {
    return "";
  }
  // Build CSV header while flattening data rows
  const headerSet = new Set<string>();
  const flattenedDataRows = dataRows.map((dataRow) => {
    const flattenedDataRow = flattenNestedObject(dataRow, fieldDelimiter);
    Object.keys(flattenedDataRow).forEach((columnName) => {
      headerSet.add(columnName);
    });
    return flattenedDataRow;
  });

  const header = Array.from(headerSet).sort();
  const rows = flattenedDataRows.map((flattenedDataRow) =>
    header.map((column) => flattenedDataRow[column])
  );
  const csvRows = [header, ...rows];
  const csvLines = csvRows.map(encodeCsvRow);
  return csvLines.join("\n");
}
