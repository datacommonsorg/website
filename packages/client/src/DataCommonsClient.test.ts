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

import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import * as _ from "lodash";
import { DataCommonsWebClient } from "./DataCommonsClient";
import {
  ApiNodePropvalOutResponse,
  PointApiResponse,
  SeriesApiResponse,
} from "./types";
import { toURLSearchParams } from "./utils";

/** Returns mocked fetch Response objects */
const buildFetchResult = (object: any) => {
  return Promise.resolve({
    json: () => Promise.resolve(object),
  });
};

const buildMockeFetchResponses = (): Record<string, any> => {
  const mockedResponses: Record<string, any> = {};
  // Mock point observations
  mockedResponses[
    `/api/observations/point/within?${toURLSearchParams({
      parentEntity: "country/MOCK",
      childType: "State",
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

  // Mock node properties
  mockedResponses[
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
  mockedResponses[
    `/api/node/propvals/out?${toURLSearchParams({
      dcids: ["Has_Data", "No_Data"],
      prop: "name",
    })}`
  ] = {
    No_Data: [
      {
        provenanceId: "Provenance",
        value: "No Data",
      },
    ],
    Has_Data: [
      {
        provenanceId: "Provenance",
        value: "Has Data",
      },
    ],
  } as ApiNodePropvalOutResponse;
  mockedResponses[
    `/api/node/propvals/out?${toURLSearchParams({
      dcids: ["state/A", "state/B", "state/C"],
      prop: "name",
    })}`
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
  mockedResponses[
    `/api/node/propvals/out?${toURLSearchParams({
      dcids: ["state/A", "state/B", "state/C"],
      prop: "isoCode",
    })}`
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
  mockedResponses[
    `/api/node/propvals/out?${toURLSearchParams({
      dcids: ["state/A", "state/B", "state/C"],
      prop: "geoJsonCoordinatesDP1",
    })}`
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

  // Mock series
  mockedResponses[
    `/api/observations/series/within?${toURLSearchParams({
      parentEntity: ["country/MOCK"],
      childType: ["State"],
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

  return mockedResponses;
};

global.fetch = jest.fn((url: string) => {
  const mockedResponses = buildMockeFetchResponses();
  const urlObject = new URL(url);
  const path = urlObject.pathname + urlObject.search;
  const response = mockedResponses[path];
  if (!response) {
    console.log("Handlers for\n", Object.keys(mockedResponses).join("\n"));
    throw new Error(`No mocked handler for ${url}`);
  }
  return buildFetchResult(response);
}) as jest.Mock<() => Promise<Response>>;

describe("DataCommonsWebClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const client = new DataCommonsWebClient();

  test("Get data rows", async () => {
    const response = await client.getDataRows({
      variables: ["Has_Data", "No_Data"],
      parentEntity: "country/MOCK",
      childType: "State",
    });
    response.forEach((row) => {
      expect(row["Has_Data.value"]).toBeGreaterThan(0);
      expect(row["No_Data.value"]).toBe(null);
    });
    expect(Object.keys(response).length).toBe(3);
  });

  test("Get GeoJSON", async () => {
    const response = await client.getGeoJSON({
      variables: ["Has_Data", "No_Data"],
      parentEntity: "country/MOCK",
      childType: "State",
    });
    console.log(JSON.stringify(response, null, 2));
    response.features.forEach((row) => {
      expect(_.get(row.properties, "Has_Data.value", 0)).toBeGreaterThan(0);
      expect(_.get(row.properties, "No_Data.value", 0)).toBe(null);
    });
    expect(Object.keys(response.features).length).toBe(3);
  });

  test("Get CSV", async () => {
    const response = await client.getCsv({
      variables: ["Has_Data", "No_Data"],
      parentEntity: "country/MOCK",
      childType: "State",
    });
    // CSV result should have 1x header row + 3x data rows
    expect(Object.keys(response.split("\n")).length).toBe(4);
  });

  test("Get per capita data rows", async () => {
    const response = await client.getDataRows({
      variables: ["Has_Data", "No_Data"],
      parentEntity: "country/MOCK",
      childType: "State",
      perCapitaVariables: ["Has_Data"],
    });
    response.forEach((row) => {
      expect(row["Has_Data.perCapita.value"]).toBeGreaterThan(0);
      expect(row["No_Data.perCapita.value"]).toBe(null);
      expect(row["entity.name"]).toBeTruthy();
    });
    expect(Object.keys(response).length).toBe(3);
  });
});
