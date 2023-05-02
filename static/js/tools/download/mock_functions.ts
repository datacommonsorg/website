/**
 * Copyright 2022 Google LLC
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

/* mocked axios calls for Page test for download tool. */

jest.mock("axios");
import axios from "axios";
import { when } from "jest-when";

import { stringifyFn } from "../../utils/axios";

export function axiosMock(): void {
  // Mock all the async axios call.
  axios.get = jest.fn();
  axios.post = jest.fn();

  const rootGroupsData = {
    data: {
      childStatVarGroups: [
        {
          displayName: "Demographics",
          id: "dc/g/Demographics",
          specializedEntity: "Demographics",
          descendentStatVarCount: 2,
        },
        {
          displayName: "Economics",
          id: "dc/g/Economics",
          specializedEntity: "Economics",
          descendentStatVarCount: 2,
        },
      ],
    },
  };

  const demographicsGroupsData = {
    data: {
      childStatVarGroups: [],
      childStatVars: [
        {
          displayName: "Population",
          id: "Count_Person",
          searchName: "Count Of Person",
          hasData: true,
        },
        {
          displayName: "Median Age",
          id: "Median_Age_Person",
          searchName: "Median Age",
          hasData: true,
        },
      ],
    },
  };

  const csvData =
    "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person\ngeoId/06001,Alameda County,2021,1648556,https://www2.census.go\ngeoId/06002,Alpine County,2021,1235,https://www2.census.gov/";

  // get statvar properties Count_Person
  when(axios.get)
    .calledWith("/api/stats/stat-var-property?dcids=Count_Person")
    .mockResolvedValue({
      data: {
        Count_Person: {
          md: "",
          mprop: "count",
          pt: "Person",
          pvs: {},
          title: "Population",
        },
      },
    });

  // get statvar properties Median_Age_Person
  when(axios.get)
    .calledWith("/api/stats/stat-var-property?dcids=Median_Age_Person")
    .mockResolvedValue({
      data: {
        Median_Age_Person: {
          md: "",
          mprop: "",
          pt: "Person",
          pvs: {},
          title: "Median Age",
        },
      },
    });

  // get place types, geoId/06
  when(axios.get)
    .calledWith("/api/place/type/geoId/06")
    .mockResolvedValue({ data: "State" });

  // get place names, geoId/06
  when(axios.get)
    .calledWith("/api/place/name?dcids=geoId/06")
    .mockResolvedValue({ data: { "geoId/06": "California" } });

  // get root stat var group
  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: [],
      numEntitiesExistence: undefined,
    })
    .mockResolvedValue(rootGroupsData);

  // get root stat var group for places in geoId/06
  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/06001", "geoId/06002"],
      numEntitiesExistence: undefined,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/06002", "geoId/06001"],
      numEntitiesExistence: undefined,
    })
    .mockResolvedValue(rootGroupsData);

  // get demographics stat var group for places in geoId/06
  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/06001", "geoId/06002"],
      numEntitiesExistence: undefined,
    })
    .mockResolvedValue(demographicsGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/06002", "geoId/06001"],
      numEntitiesExistence: undefined,
    })
    .mockResolvedValue(demographicsGroupsData);

  // stat var info for demographics node
  when(axios.get)
    .calledWith("/api/variable/info", {
      params: {
        dcids: ["Count_Person", "Median_Age_Person"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        Count_Person: {
          placeTypeSummary: {
            type1: {
              numPlaces: 0,
              topPlaces: [],
            },
          },
        },
        Median_Age_Person: {
          placeTypeSummary: {
            type1: {
              numPlaces: 0,
              topPlaces: [],
            },
          },
        },
      },
    });

  // get stat var path for Count_Person
  when(axios.get)
    .calledWith("/api/variable/path?dcid=Count_Person")
    .mockResolvedValue({
      data: ["Count_Person", "dc/g/Demographics"],
    });

  // get stat var path for Median_Age_Person
  when(axios.get)
    .calledWith("/api/variable/path?dcid=Median_Age_Person")
    .mockResolvedValue({
      data: ["Median_Age_Person", "dc/g/Demographics"],
    });

  // get places in for counties in geoId/06
  when(axios.get)
    .calledWith("/api/place/places-in?dcid=geoId/06&placeType=County")
    .mockResolvedValue({
      data: {
        "geoId/06": ["geoId/06001", "geoId/06002"],
      },
    });

  // get parent place for geoId/06
  when(axios.get)
    .calledWith("/api/place/parent/geoId/06")
    .mockResolvedValue({
      data: [{ dcid: "country/USA", type: "Country", name: "United States" }],
    });

  // get facets within place for Count_Person
  when(axios.get)
    .calledWith("/api/facets/within", {
      params: {
        childType: "County",
        maxDate: "latest",
        minDate: "latest",
        parentPlace: "geoId/06",
        statVars: ["Count_Person"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        Count_Person: {
          importName: "Facet1",
        },
      },
    });

  when(axios.get)
    .calledWith("/api/facets/within", {
      params: {
        childType: "County",
        maxDate: "",
        minDate: "2020",
        parentPlace: "geoId/06",
        statVars: ["Count_Person"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        Count_Person: {
          importName: "Facet1",
        },
      },
    });

  // get facets within place for Count_Person and Median_Age_Person
  when(axios.get)
    .calledWith("/api/facets/within", {
      params: {
        childType: "County",
        maxDate: "",
        minDate: "2020",
        parentPlace: "geoId/06",
        statVars: ["Count_Person", "Median_Age_Person"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        Count_Person: {
          importName: "Facet1",
        },
        Median_Age_Person: {
          importName: "Facet1",
        },
      },
    });

  // get place stats vars for places in geoId/06
  when(axios.post)
    .calledWith("/api/place/stat-vars/existence", {
      entities: ["geoId/06001", "geoId/06002"],
      variables: ["Count_Person"],
    })
    .mockResolvedValue({
      data: {
        Count_Person: {
          "geoId/06001": true,
          "geoId/06002": true,
        },
      },
    });

  when(axios.post)
    .calledWith("/api/place/stat-vars/existence", {
      entities: ["geoId/06002", "geoId/06001"],
      variables: ["Count_Person"],
    })
    .mockResolvedValue({
      data: {
        Count_Person: {
          "geoId/06001": true,
          "geoId/06002": true,
        },
      },
    });

  // get csv
  when(axios.post)
    .calledWith("/api/csv/within", {
      childType: "County",
      facetMap: { Count_Person: "" },
      maxDate: "latest",
      minDate: "latest",
      parentPlace: "geoId/06",
      rowLimit: 7,
      statVars: ["Count_Person"],
    })
    .mockResolvedValue({
      data: csvData,
    });

  when(axios.post)
    .calledWith("/api/csv/within", {
      childType: "County",
      facetMap: { Count_Person: "" },
      maxDate: "latest",
      minDate: "latest",
      parentPlace: "geoId/06",
      statVars: ["Count_Person"],
    })
    .mockResolvedValue({
      data: csvData,
    });

  when(axios.post)
    .calledWith("/api/csv/within", {
      childType: "County",
      facetMap: { Count_Person: "" },
      maxDate: "",
      minDate: "2020",
      parentPlace: "geoId/06",
      rowLimit: 7,
      statVars: ["Count_Person"],
    })
    .mockResolvedValue({
      data: csvData,
    });

  when(axios.post)
    .calledWith("/api/csv/within", {
      childType: "County",
      facetMap: { Count_Person: "" },
      maxDate: "",
      minDate: "2020",
      parentPlace: "geoId/06",
      statVars: ["Count_Person"],
    })
    .mockResolvedValue({
      data: csvData,
    });
}
