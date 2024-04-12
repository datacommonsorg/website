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

import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import * as _ from "lodash";
import { DEFAULT_GEOJSON_PROPERTY_NAME } from "./constants";
import { DataCommonsClient } from "./data_commons_client";
import {
  ApiNodePropvalOutResponse,
  PointApiResponse,
  SeriesApiResponse,
} from "./data_commons_web_client_types";
import { toURLSearchParams } from "./utils";

/** Returns mocked fetch Response objects */
const buildFetchResult = (object: any) => {
  return Promise.resolve({
    json: () => Promise.resolve(object),
  });
};

const buildMockedFetchResponses = (): {
  mockedResponsesGet: Record<string, any>;
  mockedResponsesPost: Record<string, Record<string, any>>;
} => {
  const mockedResponsesGet: Record<string, any> = {};
  const mockedResponsesPost: Record<string, Record<string, any>> = {};

  // Mock node properties
  mockedResponsesGet[
    `/api/node/propvals/out?${toURLSearchParams({
      dcids: ["No_Data"],
      prop: "name",
    })}`
  ] = {
    No_Data: [
      {
        provenanceId: "Provenance",
        value: "No Data",
      },
    ],
  } as ApiNodePropvalOutResponse;
  // Mock node properties
  mockedResponsesPost["/api/node/propvals/out"] = {};
  mockedResponsesPost["/api/node/propvals/out"][
    JSON.stringify({
      dcids: ["Has_Data", "No_Data"],
      prop: "name",
    })
  ] = {
    Has_Data: [
      {
        provenanceId: "Provenance",
        value: "Has Data",
      },
    ],
    No_Data: [
      {
        provenanceId: "Provenance",
        value: "No Data",
      },
    ],
  } as ApiNodePropvalOutResponse;
  mockedResponsesPost["/api/node/propvals/out"][
    JSON.stringify({
      dcids: ["state/A", "state/B", "state/C"],
      prop: "name",
    })
  ] = {
    "state/A": [
      {
        provenanceId: "Provenance",
        value: "State A",
      },
    ],
    "state/B": [
      {
        provenanceId: "Provenance",
        value: "State B",
      },
    ],
    "state/C": [
      {
        provenanceId: "Provenance",
        value: "State C",
      },
    ],
  } as ApiNodePropvalOutResponse;
  mockedResponsesPost["/api/node/propvals/out"][
    JSON.stringify({
      dcids: ["state/A", "state/B", "state/C"],
      prop: "isoCode",
    })
  ] = {
    "state/A": [
      {
        provenanceId: "Provenance",
        value: "SA",
      },
    ],
    "state/B": [
      {
        provenanceId: "Provenance",
        value: "SB",
      },
    ],
    "state/C": [
      {
        provenanceId: "Provenance",
        value: "SC",
      },
    ],
  } as ApiNodePropvalOutResponse;
  mockedResponsesPost["/api/node/propvals/out"][
    JSON.stringify({
      dcids: ["state/A", "state/B", "state/C"],
      prop: DEFAULT_GEOJSON_PROPERTY_NAME,
    })
  ] = {
    "state/A": [
      {
        provenanceId: "Provenance",
        value:
          '{"coordinates":[[[-114.21393177738366,43.08116760127493],[-124.2132268359357,32.54020842922226],[-108.57307761162878,33.13456231344715],[-114.21393177738366,43.08116760127493]]],"type":"Polygon"}',
      },
    ],
    "state/B": [
      {
        provenanceId: "Provenance",
        value:
          '{"coordinates":[[[-107.41017350242657,43.4186072395388],[-99.18918027725817,35.67665544853281],[-93.00743609426064,45.16777272963719],[-107.41017350242657,43.4186072395388]]],"type":"Polygon"}',
      },
    ],
    "state/C": [
      {
        provenanceId: "Provenance",
        value:
          '{"coordinates":[[[-89.67405957878238,38.85867674056669],[-82.27438624445035,29.05293979418066],[-75.07130842064042,38.924570398135245],[-89.67405957878238,38.85867674056669]]],"type":"Polygon"}',
      },
    ],
  } as ApiNodePropvalOutResponse;
  mockedResponsesPost["/api/node/propvals/out"][
    JSON.stringify({ dcids: ["Count_Person"], prop: "name" })
  ] = {
    Count_Person: [
      {
        provenanceId: "Provenance",
        value: "Total Population",
      },
    ],
  } as ApiNodePropvalOutResponse;

  // Mock point observations
  mockedResponsesGet[
    `/api/observations/point/within?${toURLSearchParams({
      childType: "State",
      parentEntity: "country/MOCK",
      variables: ["Has_Data", "No_Data"],
    })}`
  ] = {
    data: {
      Has_Data: {
        "state/A": {
          date: "2023",
          facet: "myfacet",
          value: 1,
        },
        "state/B": {
          date: "2023",
          facet: "myfacet",
          value: 2,
        },
        "state/C": {
          date: "2023",
          facet: "myfacet",
          value: 3,
        },
      },
      No_Data: {},
    },
    facets: {
      myfacet: {
        importName: "myimport",
        measurementMethod: "mymethod",
        provenanceUrl: "https://example.com",
        unit: "USD",
        unitDisplayName: "US Dollars",
      },
    },
  } as PointApiResponse;

  // Mock series
  mockedResponsesGet[
    `/api/observations/series/within?${toURLSearchParams({
      childType: ["State"],
      parentEntity: ["country/MOCK"],
      variables: ["Count_Person"],
    })}`
  ] = {
    data: {
      Count_Person: {
        "state/A": {
          facet: "myfacet",
          series: [
            {
              date: "2019",
              value: 3019,
            },
            {
              date: "2020",
              value: 3020,
            },
            {
              date: "2021",
              value: 3021,
            },
            {
              date: "2022",
              value: 3022,
            },
            {
              date: "2023",
              value: 3023,
            },
          ],
        },
        "state/B": {
          facet: "myfacet",
          series: [
            {
              date: "2019",
              value: 4019,
            },
            {
              date: "2020",
              value: 4020,
            },
            {
              date: "2021",
              value: 4021,
            },
            {
              date: "2022",
              value: 4022,
            },
            {
              date: "2023",
              value: 4023,
            },
          ],
        },
        "state/C": {
          facet: "myfacet",
          series: [
            {
              date: "2019",
              value: 5019,
            },
            {
              date: "2020",
              value: 5020,
            },
            {
              date: "2021",
              value: 5021,
            },
            {
              date: "2022",
              value: 5022,
            },
            {
              date: "2023",
              value: 5023,
            },
          ],
        },
      },
    },
    facets: {
      myfacet: {
        importName: "myimport",
        measurementMethod: "mymethod",
        provenanceUrl: "https://www.example.com",
      },
    },
  } as SeriesApiResponse;

  mockedResponsesGet[
    `/api/observations/series/within?${toURLSearchParams({
      childType: ["State"],
      parentEntity: ["country/MOCK"],
      variables: ["Has_Data", "No_Data"],
    })}`
  ] = {
    data: {
      Has_Data: {
        "state/A": {
          facet: "myfacet",
          series: [
            {
              date: "2019",
              value: 301.9,
            },
            {
              date: "2020",
              value: 302.0,
            },
            {
              date: "2021",
              value: 302.1,
            },
            {
              date: "2022",
              value: 302.2,
            },
            {
              date: "2023",
              value: 302.3,
            },
          ],
        },
        "state/B": {
          facet: "myfacet",
          series: [
            {
              date: "2019",
              value: 401.9,
            },
            {
              date: "2020",
              value: 402.0,
            },
            {
              date: "2021",
              value: 402.1,
            },
            {
              date: "2022",
              value: 402.2,
            },
            {
              date: "2023",
              value: 402.3,
            },
          ],
        },
        "state/C": {
          facet: "myfacet",
          series: [
            {
              date: "2019",
              value: 501.9,
            },
            {
              date: "2020",
              value: 502.0,
            },
            {
              date: "2021",
              value: 502.1,
            },
            {
              date: "2022",
              value: 502.2,
            },
            {
              date: "2023",
              value: 502.3,
            },
          ],
        },
      },
      No_Data: {},
    },
    facets: {
      myfacet: {
        importName: "myimport",
        measurementMethod: "mymethod",
        provenanceUrl: "https://example.com",
        unit: "USD",
        unitDisplayName: "US Dollars",
      },
    },
  } as SeriesApiResponse;

  return { mockedResponsesGet, mockedResponsesPost };
};

global.fetch = jest.fn(
  (url: string, options?: { method?: string; body?: string }) => {
    const { mockedResponsesGet, mockedResponsesPost } =
      buildMockedFetchResponses();
    const urlObject = new URL(url);
    const path = urlObject.pathname + urlObject.search;
    const body = options?.method === "post" ? options?.body : undefined;
    const response = body
      ? mockedResponsesPost[path][body]
      : mockedResponsesGet[path];
    if (!response) {
      throw new Error(
        `No mocked handler for "${options?.method}" ${url}.\n\nBODY=${
          options?.body
        }\n\n** GET handlers ** \n  ${Object.keys(mockedResponsesGet).join(
          "\n  "
        )}\n\n** POST handlers ** \n  ${Object.keys(mockedResponsesPost).join(
          "\n  "
        )}`
      );
    }
    return buildFetchResult(response);
  }
) as jest.Mock<() => Promise<Response>>;

describe("DataCommonsWebClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const client = new DataCommonsClient();

  test("Get data rows", async () => {
    const response = await client.getDataRows({
      childType: "State",
      parentEntity: "country/MOCK",
      variables: ["Has_Data", "No_Data"],
    });
    response.forEach((row) => {
      expect(
        ["Has_Data", "No_Data"].indexOf(row.variable.dcid)
      ).toBeGreaterThanOrEqual(0);
    });
    expect(Object.keys(response).length).toBe(3);
  });

  test("Get data rows grouped by entity", async () => {
    const response = await client.getDataRowsGroupedByEntity({
      childType: "State",
      fieldDelimiter: ".",
      parentEntity: "country/MOCK",
      variables: ["Has_Data", "No_Data"],
    });
    response.forEach((row) => {
      expect(row.variables["Has_Data"].observation.value).toBeGreaterThan(0);
      expect(row.variables["No_Data"].observation.value).toBe(null);
    });
    expect(Object.keys(response).length).toBe(3);
  });

  test("Get GeoJSON", async () => {
    const response = await client.getGeoJSON({
      childType: "State",
      fieldDelimiter: ".",
      parentEntity: "country/MOCK",
      variables: ["Has_Data", "No_Data"],
    });
    response.features.forEach((row) => {
      expect(
        _.get(row.properties, "variables.Has_Data.observation.value", 0)
      ).toBeGreaterThan(0);
      expect(
        _.get(row.properties, "variables.No_Data.observation.value", 0)
      ).toBe(null);
    });
    expect(Object.keys(response.features).length).toBe(3);
  });

  test("Get CSV", async () => {
    const response = await client.getCsv({
      childType: "State",
      fieldDelimiter: ".",
      parentEntity: "country/MOCK",
      variables: ["Has_Data", "No_Data"],
    });
    // CSV result should have 1x header row + 3x data rows
    expect(Object.keys(response.split("\n")).length).toBe(4);
  });

  test("Get per capita data rows", async () => {
    const response = await client.getDataRowsGroupedByEntity({
      childType: "State",
      parentEntity: "country/MOCK",
      perCapitaVariables: ["Has_Data"],
      variables: ["Has_Data", "No_Data"],
    });
    response.forEach((row) => {
      expect(
        row.variables["Has_Data"].perCapita?.perCapitaValue
      ).toBeGreaterThan(0);

      expect(row.variables["No_Data"].perCapita?.perCapitaValue).toBe(
        undefined
      );
      expect(row.entity.properties.name).toBeTruthy();
    });
    expect(Object.keys(response).length).toBe(3);
  });

  test("Get data row series", async () => {
    const response = await client.getDataRowSeries({
      childType: "State",
      parentEntity: "country/MOCK",
      perCapitaVariables: ["Has_Data"],
      variables: ["Has_Data", "No_Data"],
    });

    expect(response.length).toBe(15);
    response.forEach((row) => {
      expect(row.variable.dcid).toBe("Has_Data");
      expect(row.variable.observation.metadata.unitDisplayName).toBe(
        "US Dollars"
      );
      // Mock Has_Data values are set to 1/10th of the population values, so
      // quotientValue (per-capita) should be 0.1
      expect(row.variable.perCapita?.perCapitaValue).toBeCloseTo(0.1);
      expect(row.variable.perCapita?.observation.value).toBeGreaterThan(0);
    });
  });

  test("Get data row series filtered by date", async () => {
    const response1 = await client.getDataRowSeries({
      childType: "State",
      fieldDelimiter: ".",
      parentEntity: "country/MOCK",
      perCapitaVariables: ["Has_Data"],
      variables: ["Has_Data", "No_Data"],
      startDate: "2020",
      endDate: "2020",
    });
    expect(response1.length).toBe(3);
    response1.forEach((row) => {
      const observationDate = row.variable.observation.date || "";
      expect(observationDate == "2020").toBeTruthy();
    });

    const response2 = await client.getDataRowSeries({
      childType: "State",
      fieldDelimiter: ".",
      parentEntity: "country/MOCK",
      perCapitaVariables: ["Has_Data"],
      variables: ["Has_Data", "No_Data"],
      startDate: "2020",
      endDate: "2021",
    });
    expect(response2.length).toBe(6);
    response2.forEach((row) => {
      const observationDate = row.variable.observation.date || "";
      expect(observationDate >= "2020").toBeTruthy();
      expect(observationDate <= "2021").toBeTruthy();
    });

    const response3 = await client.getDataRowSeries({
      childType: "State",
      fieldDelimiter: ".",
      parentEntity: "country/MOCK",
      perCapitaVariables: ["Has_Data"],
      variables: ["Has_Data", "No_Data"],
      startDate: "2020",
    });
    expect(response3.length).toBe(12);
    response3.forEach((row) => {
      const observationDate = row.variable.observation.date || "";
      expect(observationDate >= "2020").toBeTruthy();
    });
    const response4 = await client.getDataRowSeries({
      childType: "State",
      fieldDelimiter: ".",
      parentEntity: "country/MOCK",
      perCapitaVariables: ["Has_Data"],
      variables: ["Has_Data", "No_Data"],
      endDate: "2020",
    });
    expect(response4.length).toBe(6);
    response4.forEach((row) => {
      const observationDate = row.variable.observation.date || "";
      expect(observationDate <= "2020").toBeTruthy();
    });
  });

  test("Get csv series", async () => {
    const response = await client.getCsvSeries({
      childType: "State",
      fieldDelimiter: ".",
      parentEntity: "country/MOCK",
      perCapitaVariables: ["Has_Data"],
      variables: ["Has_Data", "No_Data"],
    });
    // CSV result should have 1x header row + 15x data rows
    expect(Object.keys(response.split("\n")).length).toBe(16);
  });

  test("Specifying facet override should override returned facets", async () => {
    const response = await client.getDataRows({
      childType: "State",
      parentEntity: "country/MOCK",
      variables: ["Has_Data", "No_Data"],
    });
    response.forEach((row) => {
      expect(row.variable.observation.metadata.scalingFactor).toBe(null);
    });
    const facetOverrideClient = new DataCommonsClient({
      facetOverride: {
        USD: {
          scalingFactor: 123,
        },
      },
    });
    const facetOverrideResponse = await facetOverrideClient.getDataRows({
      childType: "State",
      parentEntity: "country/MOCK",
      variables: ["Has_Data", "No_Data"],
    });
    facetOverrideResponse.forEach((row) => {
      expect(row.variable.observation.metadata.scalingFactor).toBe(123);
    });
  });

  test("Per capita quotientValue should use scaling factor", async () => {
    const facetOverrideClient = new DataCommonsClient({
      facetOverride: {
        USD: {
          scalingFactor: 0.05,
        },
      },
    });
    const facetOverrideResponse = await facetOverrideClient.getDataRowSeries({
      childType: "State",
      fieldDelimiter: ".",
      parentEntity: "country/MOCK",
      perCapitaVariables: ["Has_Data"],
      variables: ["Has_Data", "No_Data"],
    });
    expect(facetOverrideResponse.length).toBe(15);
    facetOverrideResponse.forEach((row) => {
      expect(row.variable.dcid).toBe("Has_Data");
      expect(row.variable.observation.metadata.unitDisplayName).toBe(
        "US Dollars"
      );
      // Mock Has_Data values are set to 1/10th of the population values, so
      // quotientValue (per-capita) should equal:
      // quotientValue =  N / (N * 10 ) / scalingFactor
      // Since scaling factor is 0.05, quotientValue = 0.1 / 0.05 = 2
      expect(row.variable.perCapita?.perCapitaValue).toBeCloseTo(2);
      expect(row.variable.perCapita?.observation.value).toBeGreaterThan(0);
    });
  });
});
