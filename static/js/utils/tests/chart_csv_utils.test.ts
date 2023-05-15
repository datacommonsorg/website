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

import { DataGroup, DataPoint } from "../../chart/base";
import { GeoJsonData } from "../../chart/types";
import { RankingPoint } from "../../types/ranking_unit_types";
import {
  dataGroupsToCsv,
  dataPointsToCsv,
  mapDataToCsv,
  rankingPointsToCsv,
  scatterDataToCsv,
} from "../chart_csv_utils";

test("dataGroupsToCsv", () => {
  const dataGroupA = new DataGroup("dataGroup, A", [
    {
      label: "2020",
      value: 1,
    },
    {
      label: "2021",
      value: 2,
    },
  ]);
  const dataGroupB = new DataGroup("dataGroupB", [
    {
      label: "2020",
      value: 3,
    },
    {
      label: "2021",
      value: 4,
    },
  ]);
  const cases: {
    name: string;
    dataGroups: DataGroup[];
    expected: string;
  }[] = [
    {
      name: "empty dataGroups",
      dataGroups: [],
      expected: "",
    },
    {
      name: "single dataGroup",
      dataGroups: [dataGroupA],
      expected: 'label,"dataGroup, A"\r\n2020,1\r\n2021,2',
    },
    {
      name: "mulitple dataGroups",
      dataGroups: [dataGroupA, dataGroupB],
      expected: 'label,"dataGroup, A",dataGroupB\r\n2020,1,3\r\n2021,2,4',
    },
  ];

  for (const c of cases) {
    const csv = dataGroupsToCsv(c.dataGroups);
    try {
      expect(csv).toEqual(c.expected);
    } catch (e) {
      console.log(`Failed for case: ${c.name}`);
      throw e;
    }
  }
});

test("scatterDataToCsv", () => {
  const testPlaceA = {
    name: "testPlace, A",
    dcid: "testPlaceAId",
  };
  const testPointA = {
    place: testPlaceA,
    xVal: 1,
    yVal: 2,
    xDate: "2022-01-01",
    yDate: "2022-01-02",
    xPopVal: 3,
    xPopDate: "2021-01",
  };
  const testPoints = {
    [testPlaceA.dcid]: testPointA,
  };
  const xSv = "xSvId";
  const xDenom = "xDenomId";
  const ySv = "ySvId";
  const yDenom = "yDenomId";
  const cases: {
    name: string;
    xSv: string;
    xDenom: string;
    ySv: string;
    yDenom: string;
    expected: string;
  }[] = [
    {
      name: "with both denoms",
      xSv,
      xDenom,
      ySv,
      yDenom,
      expected: [
        "placeName,placeDcid,xDate,xValue-xSvId,yDate,yValue-ySvId,xPopulation-xDenomId,yPopulation-yDenomId",
        '"testPlace, A",testPlaceAId,2022-01-01,1,2022-01-02,2,3,N/A',
      ].join("\r\n"),
    },
    {
      name: "with x denom",
      xSv,
      xDenom,
      ySv,
      yDenom: "",
      expected: [
        "placeName,placeDcid,xDate,xValue-xSvId,yDate,yValue-ySvId,xPopulation-xDenomId",
        '"testPlace, A",testPlaceAId,2022-01-01,1,2022-01-02,2,3',
      ].join("\r\n"),
    },
    {
      name: "with y denom",
      xSv,
      xDenom: "",
      ySv,
      yDenom,
      expected: [
        "placeName,placeDcid,xDate,xValue-xSvId,yDate,yValue-ySvId,yPopulation-yDenomId",
        '"testPlace, A",testPlaceAId,2022-01-01,1,2022-01-02,2,N/A',
      ].join("\r\n"),
    },
    {
      name: "no denom",
      xSv,
      xDenom: "",
      ySv,
      yDenom: "",
      expected: [
        "placeName,placeDcid,xDate,xValue-xSvId,yDate,yValue-ySvId",
        '"testPlace, A",testPlaceAId,2022-01-01,1,2022-01-02,2',
      ].join("\r\n"),
    },
  ];

  for (const c of cases) {
    const csv = scatterDataToCsv(c.xSv, c.xDenom, c.ySv, c.yDenom, testPoints);
    try {
      expect(csv).toEqual(c.expected);
    } catch (e) {
      console.log(`Failed for case: ${c.name}`);
      throw e;
    }
  }
});

test("dataPointsToCsv", () => {
  const cases: {
    name: string;
    dataPoints: DataPoint[];
    expected: string;
  }[] = [
    {
      name: "non empty data points",
      dataPoints: [
        {
          label: "point, A",
          value: 1,
        },
        {
          label: "pointB",
          value: 2,
        },
      ],
      expected: 'label,data\r\n"point, A",1\r\npointB,2',
    },
    {
      name: "empty datapoints",
      dataPoints: [],
      expected: "label,data",
    },
  ];

  for (const c of cases) {
    const csv = dataPointsToCsv(c.dataPoints);
    try {
      expect(csv).toEqual(c.expected);
    } catch (e) {
      console.log(`Failed for case: ${c.name}`);
      throw e;
    }
  }
});

test("mapDataToCsv", () => {
  const testPlaceA = "placeA";
  const testPlaceB = "placeB";
  const testGeoJson: GeoJsonData = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: testPlaceA,
        properties: {
          name: "Place, A",
          geoDcid: testPlaceA,
        },
        geometry: { type: "MultiPolygon", coordinates: [] },
      },
      {
        type: "Feature",
        id: testPlaceB,
        properties: {
          name: "Place B",
          geoDcid: testPlaceB,
        },
        geometry: { type: "MultiPolygon", coordinates: [] },
      },
    ],
    properties: {
      currentGeo: "test_geo",
    },
  };
  const testDataValues = {
    [testPlaceA]: 1,
    [testPlaceB]: 2,
  };
  const cases: {
    name: string;
    geoJson: GeoJsonData;
    dataValues: { [placeDcid: string]: number };
    expected: string;
  }[] = [
    {
      name: "non empty geoJson and dataValues",
      geoJson: testGeoJson,
      dataValues: testDataValues,
      expected: 'label,data\r\n"Place, A",1\r\nPlace B,2',
    },
    {
      name: "empty geoJson",
      geoJson: {
        type: "FeatureCollection",
        features: [],
        properties: {
          currentGeo: "test_geo",
        },
      },
      dataValues: testDataValues,
      expected: "label,data",
    },
    {
      name: "empty dataValues",
      geoJson: testGeoJson,
      dataValues: {},
      expected: 'label,data\r\n"Place, A",N/A\r\nPlace B,N/A',
    },
  ];

  for (const c of cases) {
    const csv = mapDataToCsv(c.geoJson, c.dataValues);
    try {
      expect(csv).toEqual(c.expected);
    } catch (e) {
      console.log(`Failed for case: ${c.name}`);
      throw e;
    }
  }
});

test("rankingPointsToCsv", () => {
  const cases: {
    name: string;
    rankingPoints: RankingPoint[];
    dataHeadings: string[];
    expected: string;
  }[] = [
    {
      name: "empty ranking points",
      rankingPoints: [],
      dataHeadings: ["data"],
      expected: "rank,place,data",
    },
    {
      name: "non empty ranking points",
      rankingPoints: [
        {
          placeDcid: "placeAId",
          placeName: "place, AName",
          value: 1,
          rank: 1,
        },
        {
          placeDcid: "placeBId",
          value: 2,
          rank: 2,
        },
        {
          placeDcid: "placeCId",
          placeName: "placeCName",
          value: 3,
        },
      ],
      dataHeadings: ["data"],
      expected: [
        "rank,place,data",
        '1,"place, AName",1',
        "2,placeBId,2",
        "3,placeCName,3",
      ].join("\r\n"),
    },
    {
      name: "multi column",
      rankingPoints: [
        {
          placeDcid: "placeAId",
          placeName: "placeAName",
          values: [1, 2],
          rank: 1,
        },
        {
          placeDcid: "placeBId",
          values: [2, 3],
          rank: 2,
        },
        {
          placeDcid: "placeCId",
          placeName: "placeCName",
          values: [3, 4],
        },
      ],
      dataHeadings: ["data, 1", "data2"],
      expected: [
        'rank,place,"data, 1",data2',
        "1,placeAName,1,2",
        "2,placeBId,2,3",
        "3,placeCName,3,4",
      ].join("\r\n"),
    },
  ];

  for (const c of cases) {
    const csv = rankingPointsToCsv(c.rankingPoints, c.dataHeadings);
    try {
      expect(csv).toEqual(c.expected);
    } catch (e) {
      console.log(`Failed for case: ${c.name}`);
      throw e;
    }
  }
});
