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

import { StatMetadata } from "../../shared/stat_types";
import { StatVarSpec } from "../../shared/types";
import {
  buildExploreUrl,
  extractFacetMetadataUrlHashParams,
  getUpdatedHash,
  getUrlWithSearchParamsToPropagate,
} from "../url_utils";

describe("getUpdatedHash", () => {
  const originalHash = "#foo=bar&baz=qux&hl=en&enable_feature=1";

  beforeEach(() => {
    // Set up a default hash for each test
    window.location.hash = originalHash;
  });

  afterAll(() => {
    window.location.hash = originalHash; // Reset to original hash after tests
  });

  test("updates single param and removes others", () => {
    const params = { foo: "newval" };
    const result = getUpdatedHash(params);
    // 'hl' and 'enable_feature' are persisted
    expect(result).toContain("foo=newval");
    expect(result).not.toContain("baz=qux");
    expect(result).toContain("hl=en");
    expect(result).toContain("enable_feature=1");
  });

  test("removes param if value is empty string", () => {
    const params = { foo: "" };
    const result = getUpdatedHash(params);
    expect(result).not.toContain("foo=");
    expect(result).toContain("hl=en");
    expect(result).toContain("enable_feature=1");
  });

  test("adds new param", () => {
    const params = { newparam: "val" };
    const result = getUpdatedHash(params);
    expect(result).toContain("newparam=val");
    expect(result).toContain("hl=en");
    expect(result).toContain("enable_feature=1");
    expect(result).not.toContain("foo=bar");
    expect(result).not.toContain("baz=qux");
  });

  test("persists only PARAMS_TO_PERSIST", () => {
    const params = {};
    const result = getUpdatedHash(params);
    expect(result).toContain("hl=en");
    expect(result).toContain("enable_feature=1");
    expect(result).not.toContain("foo=bar");
    expect(result).not.toContain("baz=qux");
  });

  test("removes all except persisted and new", () => {
    const params = { newparam: "x" };
    const result = getUpdatedHash(params);
    expect(result).toContain("newparam=x");
    expect(result).toContain("hl=en");
    expect(result).toContain("enable_feature=1");
    expect(result).not.toContain("foo=bar");
    expect(result).not.toContain("baz=qux");
  });

  test("works with empty hash", () => {
    const params = { foo: "bar" };
    const result = getUpdatedHash(params);
    expect(result).toContain("foo=bar");
  });
});

describe("getUrlWithSearchParamsToPropagate", () => {
  const originalLocation = window.location.href;

  afterAll(() => {
    window.history.pushState({}, "", originalLocation); // Reset to original location
  });

  test("appends search params from window to target URL", () => {
    window.history.pushState({}, "", "/?hl=en");
    const result = getUrlWithSearchParamsToPropagate("/api/data");
    expect(result).toBe("/api/data?hl=en");
  });

  test("merges search params with existing query params", () => {
    window.history.pushState({}, "", "/?hl=en");
    const result = getUrlWithSearchParamsToPropagate("/api/data?foo=bar");
    expect(result).toBe("/api/data?foo=bar&hl=en");
  });

  test("only propagates allowed parameters", () => {
    window.history.pushState({}, "", "/?hl=en&unrelated=123");
    const result = getUrlWithSearchParamsToPropagate("/api/data");
    expect(result).toBe("/api/data?hl=en");
    expect(result).not.toContain("unrelated");
  });

  test("works with absolute URLs", () => {
    window.history.pushState({}, "", "/?hl=en");
    const result = getUrlWithSearchParamsToPropagate("https://example.com/api");
    expect(result).toBe("https://example.com/api?hl=en");
  });
});

describe("buildExploreUrl", () => {
  const statVarSpecs: StatVarSpec[] = [
    {
      statVar: "Count_Person",
      denom: "",
      unit: "",
      scaling: 1,
      log: false,
    },
  ];

  test("emits the provenance ID as the imp param", () => {
    // Test: Facet provenance ID is carried in the imp param.
    // Situation: Facet metadata has provenanceId 'dc/base/CensusACS5YearSurvey' and a measurement method.
    // Expectation: URL contains the encoded provenance ID as imp, plus mm.
    const result = buildExploreUrl(
      "TIMELINE_WITH_HIGHLIGHT",
      ["country/USA"],
      statVarSpecs,
      {
        provenanceId: "dc/base/CensusACS5YearSurvey",
        measurementMethod: "CensusACS5yrSurvey",
      }
    );
    expect(result).toContain("imp=dc%2Fbase%2FCensusACS5YearSurvey");
    expect(result).toContain("mm=CensusACS5yrSurvey");
  });

  test("does not fall back to importName", () => {
    // Test: No importName fallback for the imp param.
    // Situation: Facet metadata has only importName set, no provenanceId.
    // Expectation: URL contains no imp param.
    const facet: StatMetadata = { importName: "CensusACS5YearSurvey" };
    const result = buildExploreUrl(
      "TIMELINE_WITH_HIGHLIGHT",
      ["country/USA"],
      statVarSpecs,
      facet
    );
    expect(result).not.toContain("imp=");
  });
});

describe("extractFacetMetadataUrlHashParams", () => {
  test("parses imp into provenanceId", () => {
    // Test: The imp param is parsed as a provenance ID.
    // Situation: Hash params contain imp 'dc/base/CensusACS5YearSurvey'.
    // Expectation: Returned facet metadata has that provenanceId.
    expect(
      extractFacetMetadataUrlHashParams({
        imp: "dc/base/CensusACS5YearSurvey",
      })?.provenanceId
    ).toBe("dc/base/CensusACS5YearSurvey");
  });

  test("returns undefined when no facet params are present", () => {
    // Test: No facet params.
    // Situation: Hash params are empty.
    // Expectation: Returns undefined.
    expect(extractFacetMetadataUrlHashParams({})).toBeUndefined();
  });
});
