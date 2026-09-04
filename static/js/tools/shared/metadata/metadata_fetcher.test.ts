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

/* eslint-disable camelcase */
import { FacetResponse } from "../../../utils/data_fetch_utils";
import { fetchFacetsWithMetadata } from "./metadata_fetcher";

describe("fetchFacetsWithMetadata", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Test: Payload sanitization and client-side URL retention.
  // Situation: Facets containing external provenanceUrl query strings are enriched via API.
  // Expectation: provenanceUrl is excluded from the POST request body, but retained in returned client objects alongside enriched metadata.
  it("strips provenanceUrl from outgoing payload and retains it in merged result", async () => {
    const inputFacets: FacetResponse = {
      Count_Person: {
        facet1: {
          importName: "CensusACS5YearSurvey",
          provenanceId: "dc/base/Census",
          provenanceUrl:
            "https://census.gov/data?query=test&id=123&token=abc%20def",
          measurementMethod: "CensusSurvey",
        },
      },
    };

    const mockEnrichedResponse: FacetResponse = {
      Count_Person: {
        facet1: {
          importName: "CensusACS5YearSurvey",
          provenanceId: "dc/base/Census",
          sourceName: "Census.gov",
          provenanceName: "U.S. Census Bureau",
          dateRangeStart: "2015",
          dateRangeEnd: "2020",
        },
      },
    };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockEnrichedResponse),
    });
    global.fetch = mockFetch;

    const result = await fetchFacetsWithMetadata(inputFacets, {
      entities: ["geoId/06"],
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("/api/metadata/facets");
    expect(calledOptions.method).toBe("POST");

    const sentPayload = JSON.parse(calledOptions.body);
    // Verify provenanceUrl was stripped from outgoing payload
    expect(
      sentPayload.facets.Count_Person.facet1.provenanceUrl
    ).toBeUndefined();
    expect(sentPayload.facets.Count_Person.facet1.importName).toBe(
      "CensusACS5YearSurvey"
    );
    expect(sentPayload.facets.Count_Person.facet1.provenanceId).toBe(
      "dc/base/Census"
    );

    // Verify returned object retains original provenanceUrl and merged metadata
    expect(result.Count_Person.facet1.provenanceUrl).toBe(
      "https://census.gov/data?query=test&id=123&token=abc%20def"
    );
    expect(result.Count_Person.facet1.sourceName).toBe("Census.gov");
    expect(result.Count_Person.facet1.provenanceName).toBe(
      "U.S. Census Bureau"
    );
    expect(result.Count_Person.facet1.dateRangeStart).toBe("2015");
    expect(result.Count_Person.facet1.dateRangeEnd).toBe("2020");
  });

  // Test: Fallback on HTTP error.
  // Situation: The enrichment endpoint returns HTTP 403 Forbidden (Cloud Armor block).
  // Expectation: The function returns original facets with provenanceUrl intact without crashing.
  it("returns original facets with provenanceUrl intact when API returns non-200", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {
      /* ignore */
    });

    const inputFacets: FacetResponse = {
      Count_Person: {
        facet1: {
          importName: "EurostatData",
          provenanceId: "dc/base/Eurostat",
          provenanceUrl: "https://ec.europa.eu/eurostat/wdds/rest/data/v2/nl",
        },
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
    });

    const result = await fetchFacetsWithMetadata(inputFacets, {});

    expect(result).toBe(inputFacets);
    expect(result.Count_Person.facet1.provenanceUrl).toBe(
      "https://ec.europa.eu/eurostat/wdds/rest/data/v2/nl"
    );
    expect(consoleSpy).toHaveBeenCalledWith("Failed to enrich facets via API");

    consoleSpy.mockRestore();
  });

  // Test: Fallback on network exception.
  // Situation: fetch throws a network rejection.
  // Expectation: The exception is caught and original facets are returned intact.
  it("returns original facets with provenanceUrl intact when fetch throws", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {
      /* ignore */
    });

    const inputFacets: FacetResponse = {
      Count_Person: {
        facet1: {
          importName: "EurostatData",
          provenanceUrl: "https://ec.europa.eu/eurostat",
        },
      },
    };

    global.fetch = jest.fn().mockRejectedValue(new Error("Connection refused"));

    const result = await fetchFacetsWithMetadata(inputFacets, {});

    expect(result).toBe(inputFacets);
    expect(result.Count_Person.facet1.provenanceUrl).toBe(
      "https://ec.europa.eu/eurostat"
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error enriching facets:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  // Test: Empty facets input.
  // Situation: fetchFacetsWithMetadata called with an empty facet dictionary.
  // Expectation: Returns empty object immediately without dispatching a network request.
  it("returns immediately without calling fetch if facets object is empty", async () => {
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    const result = await fetchFacetsWithMetadata({}, {});

    expect(result).toEqual({});
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // Test: Multi-variable and multi-facet payload sanitization and merge.
  // Situation: Multiple statistical variables with multiple facets, some with provenanceUrl and some without.
  // Expectation: All provenanceUrls are stripped from outgoing POST body, original provenanceUrls are retained in merged output, facets without provenanceUrl do not gain a provenanceUrl property, and enriched fields are merged across all facets.
  it("sanitizes and merges multiple stat vars and facets, preserving absence of provenanceUrl", async () => {
    const inputFacets: FacetResponse = {
      Count_Person: {
        facet1: {
          importName: "CensusACS5YearSurvey",
          provenanceUrl: "https://census.gov/data?query=test",
        },
        facet2: {
          importName: "CensusPEP",
          measurementMethod: "CensusPEPSurvey",
        },
      },
      Median_Income_Person: {
        facet3: {
          importName: "BLSData",
          provenanceUrl: "https://bls.gov/data/income",
          unit: "USDollar",
        },
      },
    };

    const mockEnrichedResponse: FacetResponse = {
      Count_Person: {
        facet1: {
          sourceName: "Census.gov",
          provenanceName: "U.S. Census Bureau",
        },
        facet2: {
          sourceName: "Census.gov",
          provenanceName: "U.S. Census Bureau Population Estimates",
        },
      },
      Median_Income_Person: {
        facet3: {
          sourceName: "BLS",
          provenanceName: "Bureau of Labor Statistics",
          unitDisplayName: "US Dollar",
        },
      },
    };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockEnrichedResponse),
    });
    global.fetch = mockFetch;

    const result = await fetchFacetsWithMetadata(inputFacets, {
      entities: ["geoId/06"],
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, calledOptions] = mockFetch.mock.calls[0];
    const sentPayload = JSON.parse(calledOptions.body);

    // Verify provenanceUrl stripped across all stat vars and facets
    expect(
      sentPayload.facets.Count_Person.facet1.provenanceUrl
    ).toBeUndefined();
    expect(sentPayload.facets.Count_Person.facet1.importName).toBe(
      "CensusACS5YearSurvey"
    );
    expect(
      sentPayload.facets.Median_Income_Person.facet3.provenanceUrl
    ).toBeUndefined();
    expect(sentPayload.facets.Median_Income_Person.facet3.importName).toBe(
      "BLSData"
    );

    // Verify facet2 never had provenanceUrl in sent payload
    expect("provenanceUrl" in sentPayload.facets.Count_Person.facet2).toBe(
      false
    );

    // Verify returned merged output
    expect(result.Count_Person.facet1.provenanceUrl).toBe(
      "https://census.gov/data?query=test"
    );
    expect(result.Count_Person.facet1.provenanceName).toBe(
      "U.S. Census Bureau"
    );

    // Verify facet without provenanceUrl does not have provenanceUrl property
    expect("provenanceUrl" in result.Count_Person.facet2).toBe(false);
    expect(result.Count_Person.facet2.measurementMethod).toBe(
      "CensusPEPSurvey"
    );
    expect(result.Count_Person.facet2.provenanceName).toBe(
      "U.S. Census Bureau Population Estimates"
    );

    expect(result.Median_Income_Person.facet3.provenanceUrl).toBe(
      "https://bls.gov/data/income"
    );
    expect(result.Median_Income_Person.facet3.provenanceName).toBe(
      "Bureau of Labor Statistics"
    );
    expect(result.Median_Income_Person.facet3.unitDisplayName).toBe(
      "US Dollar"
    );
  });
});
