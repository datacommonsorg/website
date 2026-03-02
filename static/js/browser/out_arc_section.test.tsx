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

/**
 * Tests for the out arc section.
 */

import { shouldIgnoreProperty } from "./out_arc_section";

describe("test shouldIgnoreProperty", () => {
  test.each([
    // Test ignored properties
    ["provenance", true],
    ["kmlCoordinates", true],
    ["firePerimeter", true],
    // Test ignored prefixes
    ["geoJsonCoordinates", true],
    ["geoJsonCoordinatesDP1", true],
    ["geoJsonCoordinatesIndia", true],
    // Test non-ignored properties
    ["name", false],
    ["typeOf", false],
    ["description", false],
    ["dcid", false],
  ])("should return %p for %p", (property, expected) => {
    expect(shouldIgnoreProperty(property)).toBe(expected);
  });
});
