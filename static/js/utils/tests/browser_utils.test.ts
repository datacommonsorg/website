/**
 * Copyright 2026 Google LLC
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

import {
  getInArcSubsectionElementId,
  getOutArcRowElementId,
  isHttpUrl,
  sanitizeHttpUrl,
} from "../browser_utils";

describe("browser_utils", () => {
  test("element id helpers format ids", () => {
    expect(getOutArcRowElementId("url", 2)).toBe("browser-arc-url-2");
    expect(getInArcSubsectionElementId("Place", "containedInPlace")).toBe(
      "Place-containedInPlace"
    );
  });

  test.each([
    [
      "https://wonder.cdc.gov/natality.html",
      "https://wonder.cdc.gov/natality.html",
    ],
    [
      "https://data.gov.au/data/dataset/grim-books",
      "https://data.gov.au/data/dataset/grim-books",
    ],
    [
      "https://data.gov.au/data/dataset/488ef6d4-c763-4b24-b8fb-9c15b67ece19/resource/edcbc14c-ba7c-44ae-9d4f-2622ad3fafe0/download/aihw-phe-229-grim-data-gov-au-2026.csv",
      "https://data.gov.au/data/dataset/488ef6d4-c763-4b24-b8fb-9c15b67ece19/resource/edcbc14c-ba7c-44ae-9d4f-2622ad3fafe0/download/aihw-phe-229-grim-data-gov-au-2026.csv",
    ],
    ["http://example.org/dataset", "http://example.org/dataset"],
    ["  https://example.org/trimmed  ", "https://example.org/trimmed"],
    [
      "HTTPS://wonder.cdc.gov/natality.html",
      "https://wonder.cdc.gov/natality.html",
    ],
    ["", null],
    [undefined, null],
    ["https://", null],
    ["http://", null],
    ["https://example.org with spaces in sentence", null],
    ["Published on https://data.gov.au in 2026", null],
    ["javascript:alert(1)", null],
    ["JavaScript:alert(1)", null],
    ["data:text/html,<script>alert(1)</script>", null],
    ["vbscript:msgbox(1)", null],
    ["ftp://files.example.org/data.csv", null],
    ["dcsci/p/AIHW_GRIM_2026_edcbc14c", null],
  ])("sanitizeHttpUrl(%p) returns %p", (input, expected) => {
    expect(sanitizeHttpUrl(input)).toBe(expected);
    expect(isHttpUrl(input)).toBe(expected !== null);
  });
});
