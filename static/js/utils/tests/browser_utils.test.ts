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
} from "../browser_utils";

describe("browser_utils", () => {
  test("element id helpers format ids", () => {
    expect(getOutArcRowElementId("url", 2)).toBe("browser-arc-url-2");
    expect(getInArcSubsectionElementId("Place", "containedInPlace")).toBe(
      "Place-containedInPlace"
    );
  });

  test.each([
    ["https://wonder.cdc.gov/natality.html", true],
    ["https://data.gov.au/data/dataset/grim-books", true],
    [
      "https://data.gov.au/data/dataset/488ef6d4-c763-4b24-b8fb-9c15b67ece19/resource/edcbc14c-ba7c-44ae-9d4f-2622ad3fafe0/download/aihw-phe-229-grim-data-gov-au-2026.csv",
      true,
    ],
    ["http://example.org/dataset", true],
    ["  https://example.org/trimmed  ", true],
    ["", false],
    [undefined, false],
    ["https://", false],
    ["http://", false],
    ["https://example.org with spaces in sentence", false],
    ["Published on https://data.gov.au in 2026", false],
    ["javascript:alert(1)", false],
    ["data:text/html,<script>alert(1)</script>", false],
    ["ftp://files.example.org/data.csv", false],
    ["dcsci/p/AIHW_GRIM_2026_edcbc14c", false],
  ])("isHttpUrl(%p) returns %p", (input, expected) => {
    expect(isHttpUrl(input)).toBe(expected);
  });
});
