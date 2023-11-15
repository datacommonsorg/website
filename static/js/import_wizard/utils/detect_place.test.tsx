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
import _ from "lodash";

import { ConfidenceLevel, DetectedDetails, TypeProperty } from "../types";
import { PlaceDetector } from "./detect_place";

test("placeTypesAndProperties", () => {
  const det = new PlaceDetector();
  const expected = new Set<TypeProperty>([
    {
      dcType: { dcid: "GeoCoordinates", displayName: "Geo Coordinates" },
      dcProperty: { dcid: "longitude", displayName: "Longitude" },
    },
    {
      dcType: { dcid: "GeoCoordinates", displayName: "Geo Coordinates" },
      dcProperty: { dcid: "latitude", displayName: "Latitude" },
    },
    {
      dcType: { dcid: "GeoCoordinates", displayName: "Geo Coordinates" },
      dcProperty: { dcid: "name", displayName: "Name" },
    },
    {
      dcType: { dcid: "Country", displayName: "Country" },
      dcProperty: { dcid: "name", displayName: "Name" },
    },
    {
      dcType: { dcid: "Country", displayName: "Country" },
      dcProperty: { dcid: "isoCode", displayName: "ISO Code" },
    },
    {
      dcType: { dcid: "Country", displayName: "Country" },
      dcProperty: { dcid: "countryAlpha3Code", displayName: "Alpha 3 Code" },
    },
    {
      dcType: { dcid: "Country", displayName: "Country" },
      dcProperty: { dcid: "countryNumericCode", displayName: "Numeric Code" },
    },
    {
      dcType: { dcid: "State", displayName: "State" },
      dcProperty: { dcid: "name", displayName: "Name" },
    },
    {
      dcType: { dcid: "State", displayName: "State" },
      dcProperty: { dcid: "isoCode", displayName: "ISO Code" },
    },
    {
      dcType: { dcid: "State", displayName: "State" },
      dcProperty: {
        dcid: "fips52AlphaCode",
        displayName: "US State Alpha Code",
      },
    },
    {
      dcType: { dcid: "State", displayName: "State" },
      dcProperty: {
        dcid: "geoId",
        displayName: "FIPS Code",
      },
    },
    {
      dcType: { dcid: "Province", displayName: "Province" },
      dcProperty: { dcid: "name", displayName: "Name" },
    },
    {
      dcType: { dcid: "Municipality", displayName: "Municipality" },
      dcProperty: { dcid: "name", displayName: "Name" },
    },
    {
      dcType: { dcid: "County", displayName: "County" },
      dcProperty: { dcid: "name", displayName: "Name" },
    },
    {
      dcType: { dcid: "City", displayName: "City" },
      dcProperty: { dcid: "name", displayName: "Name" },
    },
  ]);
  expect(det.placeTypesAndProperties).toEqual(expected);
});

test("supportedPlaceTypeProperties", () => {
  const det = new PlaceDetector();
  const expected = new Set<TypeProperty>([
    {
      dcType: { dcid: "Country", displayName: "Country" },
      dcProperty: { dcid: "name", displayName: "Name" },
    },
    {
      dcType: { dcid: "Country", displayName: "Country" },
      dcProperty: { dcid: "isoCode", displayName: "ISO Code" },
    },
    {
      dcType: { dcid: "Country", displayName: "Country" },
      dcProperty: { dcid: "countryAlpha3Code", displayName: "Alpha 3 Code" },
    },
    {
      dcType: { dcid: "Country", displayName: "Country" },
      dcProperty: { dcid: "countryNumericCode", displayName: "Numeric Code" },
    },
    {
      dcType: { dcid: "State", displayName: "State" },
      dcProperty: { dcid: "name", displayName: "Name" },
    },
    {
      dcType: { dcid: "State", displayName: "State" },
      dcProperty: { dcid: "isoCode", displayName: "ISO Code" },
    },
    {
      dcType: { dcid: "State", displayName: "State" },
      dcProperty: {
        dcid: "fips52AlphaCode",
        displayName: "US State Alpha Code",
      },
    },
    {
      dcType: { dcid: "State", displayName: "State" },
      dcProperty: { dcid: "geoId", displayName: "FIPS Code" },
    },
  ]);
  expect(det.getSupportedPlaceTypesAndProperties()).toEqual(expected);
});

test("placeDetectionKeys", () => {
  const expected = new Set<string>([
    "longitude",
    "latitude",
    "latlon",
    "geocoordinates",
    "country",
    "state",
    "province",
    "municipality",
    "county",
    "city",
  ]);
  const got = new Set(PlaceDetector.columnToTypePropertyMapping.keys());
  expect(got).toEqual(expected);
});

test("countries", () => {
  const det = new PlaceDetector();
  const numCountriesExpected = 271;
  const numIsoCodes = 247; // 24 countries without ISO codes.
  const numAbbrv3Codes = 246; // 25 countries without 3-letter abbreviations.
  const numNumeric = 246; // 25 countries without numeric codes.
  expect(det.countryNames.size).toEqual(numCountriesExpected);
  expect(det.countryISO.size).toEqual(numIsoCodes);
  expect(det.countryAbbrv3.size).toEqual(numAbbrv3Codes);
  expect(det.countryNumeric.size).toEqual(numNumeric);

  // Some other random spot checks.
  // Norway.
  expect(det.countryNames).toContain("norway");
  expect(det.countryISO).toContain("no");
  expect(det.countryAbbrv3).toContain("nor");
  expect(det.countryNumeric).toContain("578"); // Senegal.

  expect(det.countryNames).toContain("senegal");
  expect(det.countryISO).toContain("sn");
  expect(det.countryAbbrv3).toContain("sen");
  expect(det.countryNumeric).toContain("686"); // Other checks.

  expect(det.countryNames).not.toContain("");
  expect(det.countryNames).not.toContain(null);

  expect(det.countryISO).not.toContain("");
  expect(det.countryISO).not.toContain(null);

  expect(det.countryAbbrv3).not.toContain("");
  expect(det.countryAbbrv3).not.toContain(null);

  expect(det.countryNumeric).not.toContain("");
  expect(det.countryNumeric).not.toContain(null);
  expect(det.countryNumeric).not.toContain(0);
});

test("States", () => {
  const det = new PlaceDetector();
  const numStatesExpected = 89; // US and India.
  const numIsoCodes = 89; // US and India.
  const numFips52AlphaCodes = 52; // US only.
  const numFipsCodes = 52; // US only.

  expect(det.stateNames.size).toEqual(numStatesExpected);
  expect(det.stateISO.size).toEqual(numIsoCodes);
  expect(det.stateFipsAlpha.size).toEqual(numFips52AlphaCodes);
  expect(det.stateFipsCode.size).toEqual(numFipsCodes);

  // Some random checks.
  // California.
  expect(det.stateNames).toContain("california");
  expect(det.stateISO).toContain("us-ca");
  expect(det.stateFipsAlpha).toContain("ca");
  expect(det.stateFipsCode).toContain("06");

  // New York.
  expect(det.stateNames).toContain("newyork");
  expect(det.stateNames).toContain("newyork");
  expect(det.stateISO).toContain("us-ny");
  expect(det.stateFipsAlpha).toContain("ny");
  expect(det.stateFipsCode).toContain("36");

  // Texas.
  expect(det.stateNames).toContain("texas");
  expect(det.stateISO).toContain("us-tx");
  expect(det.stateFipsAlpha).toContain("tx");
  expect(det.stateFipsCode).toContain("48");

  // Haryana (India).
  expect(det.stateNames).toContain("haryana");
  expect(det.stateISO).toContain("in-hr");
});

test("placeLowConfidenceDetection", () => {
  const det = new PlaceDetector();

  expect(det.detectLowConfidence("")).toBe(null);
  expect(det.detectLowConfidence(" ")).toBe(null);
  expect(det.detectLowConfidence("continent")).toBe(null);

  const countryType = { dcType: { dcid: "Country", displayName: "Country" } };
  const stateType = { dcType: { dcid: "State", displayName: "State" } };
  const countyType = { dcType: { dcid: "County", displayName: "County" } };
  const cityType = { dcType: { dcid: "City", displayName: "City" } };

  expect(_.isEqual(det.detectLowConfidence("Country.."), countryType)).toBe(
    true
  );
  expect(_.isEqual(det.detectLowConfidence("Country"), countryType)).toBe(true);
  expect(_.isEqual(det.detectLowConfidence("cOuntry"), countryType)).toBe(true);
  expect(_.isEqual(det.detectLowConfidence("COUNTRY"), countryType)).toBe(true);
  expect(_.isEqual(det.detectLowConfidence("State  "), stateType)).toBe(true);
  expect(_.isEqual(det.detectLowConfidence("County---"), countyType)).toBe(
    true
  );
  expect(_.isEqual(det.detectLowConfidence("city"), cityType)).toBe(true);

  const geoType = {
    dcType: { dcid: "GeoCoordinates", displayName: "Geo Coordinates" },
  };
  expect(_.isEqual(det.detectLowConfidence("Lat-Lon"), geoType)).toBe(true);
  expect(_.isEqual(det.detectLowConfidence("Lat,Lon"), geoType)).toBe(true);
  expect(_.isEqual(det.detectLowConfidence("LatLon"), geoType)).toBe(true);
  expect(_.isEqual(det.detectLowConfidence("Geo-coordinates"), geoType)).toBe(
    true
  );
  expect(_.isEqual(det.detectLowConfidence("Geo Coordinates"), geoType)).toBe(
    true
  );
  expect(_.isEqual(det.detectLowConfidence("GeoCoordinates"), geoType)).toBe(
    true
  );
  expect(_.isEqual(det.detectLowConfidence("longitude()()"), geoType)).toBe(
    true
  );
  expect(_.isEqual(det.detectLowConfidence("Latitude=#$#$%"), geoType)).toBe(
    true
  );
});

test("detectionLowConf", () => {
  const det = new PlaceDetector();

  expect(det.detect("randomColName", ["1", "2", "3"])).toBe(null);
  expect(det.detect("", [])).toBe(null);

  const expected: DetectedDetails = {
    detectedTypeProperty: { dcType: { dcid: "City", displayName: "City" } },
    confidence: ConfidenceLevel.Low,
  };
  const notExpected: DetectedDetails = {
    detectedTypeProperty: { dcType: { dcid: "City", displayName: "City" } },
    confidence: ConfidenceLevel.High, // should be Low.
  };

  // Should return low confidence detection of a city.
  const got = det.detect("city", ["a", "b", "c"]);

  expect(_.isEqual(expected, got)).toBe(true);
  expect(_.isEqual(notExpected, got)).toBe(false);
});

test("countryHighConf", () => {
  const det = new PlaceDetector();
  const cases: {
    name: string;
    colArray: Array<string>;
    expected: TypeProperty;
  }[] = [
    {
      name: "name-detection",
      colArray: [
        "United states",
        "Norway",
        "sri lanka",
        "new zealand",
        "south africa",
        "australia",
        "Pakistan",
        "India",
        "bangladesh",
        "french Afars and Issas",
      ],
      expected: {
        dcType: { dcid: "Country", displayName: "Country" },
        dcProperty: { dcid: "name", displayName: "Name" },
      },
    },
    {
      name: "iso-detection",
      colArray: ["us", "no", "lk", "nz", "sa", "au", "pk", "in", "bd", "it"],
      expected: {
        dcType: { dcid: "Country", displayName: "Country" },
        dcProperty: { dcid: "isoCode", displayName: "ISO Code" },
      },
    },
    {
      name: "alpha3-detection",
      colArray: [
        "usa",
        "NOR",
        "lka",
        "nzl",
        "zaf",
        "aus",
        "pak",
        "ind",
        "bgd",
        "ita",
      ],
      expected: {
        dcType: { dcid: "Country", displayName: "Country" },
        dcProperty: {
          dcid: "countryAlpha3Code",
          displayName: "Alpha 3 Code",
        },
      },
    },
    {
      name: "numeric-detection",
      colArray: [
        "840",
        "578",
        "144",
        "554",
        "710",
        "36",
        "586",
        "356",
        "50",
        "380",
      ],
      expected: {
        dcType: { dcid: "Country", displayName: "Country" },
        dcProperty: {
          dcid: "countryNumericCode",
          displayName: "Numeric Code",
        },
      },
    },
    {
      name: "numeric-detection-with-null",
      colArray: [
        "840",
        "578",
        "144",
        "554",
        "710",
        "36",
        "586",
        null,
        null,
        null,
      ],
      expected: {
        dcType: { dcid: "Country", displayName: "Country" },
        dcProperty: {
          dcid: "countryNumericCode",
          displayName: "Numeric Code",
        },
      },
    },
    {
      name: "name-no-detection", // No detection. Too many non names.
      colArray: [
        "United statesssss",
        "Norwayyyy",
        "sri lankawwww",
        "new zealandiiiiii",
        "north africaaaaaaaaa",
        "australiayyyyy",
        "Pakistanyyyyyy",
        "Indiannnnnn",
        "bangladesh",
        "french Afars and Issas",
      ],
      expected: null,
    },
    {
      name: "iso-no-detection", // No detection. Too many non-ISO codes.
      colArray: ["aa", "dd", "ff", "ww", "xx", "yy", "uu", "bd", "it"],
      expected: null,
    },
    {
      name: "alpha3-no-detection", // No detection. Too many non-Alpha3 codes.
      colArray: [
        "aaa",
        "bbb",
        "ccc",
        "ddd",
        "zzz",
        "yyy",
        "xxx",
        "ind",
        "bgd",
        "ita",
      ],
      expected: null,
    },
    {
      name: "numeric-no-detection", // No detection. Too many non-numeric codes.
      colArray: ["0", "1", "2", "-1", "-2", "-3", "-4", "-5", "50", "380"],
      expected: null,
    },
  ];
  for (const c of cases) {
    if (c.expected == null) {
      expect(det.detect("", c.colArray)).toBe(null);
      continue;
    }
    expect(det.detect("country", c.colArray)).toStrictEqual({
      detectedTypeProperty: c.expected,
      confidence: ConfidenceLevel.High,
    });
  }
});

test("stateHighConf", () => {
  const det = new PlaceDetector();
  const cases: {
    name: string;
    colArray: Array<string>;
    expected: TypeProperty;
  }[] = [
    {
      name: "name-detection",
      colArray: [
        "california",
        "new york",
        "massahusetts",
        "new hampshire",
        "south dakota",
        "north dakota",
        "washington",
        "puerto rico",
        "michigan",
        "idaho",
      ],
      expected: {
        dcType: { dcid: "State", displayName: "State" },
        dcProperty: { dcid: "name", displayName: "Name" },
      },
    },
    {
      name: "iso-detection",
      colArray: [
        "US-CA",
        "US-NY",
        "US-MA",
        "US-NH",
        "US-SD",
        "US-ND",
        "US-WA",
        "US-PR",
        "US-MI",
        "US-ID",
      ],
      expected: {
        dcType: { dcid: "State", displayName: "State" },
        dcProperty: { dcid: "isoCode", displayName: "ISO Code" },
      },
    },
    {
      name: "fips52AlphaCode",
      colArray: ["nm", "ny", "wy", "nj", "ct", "nd", "nh", "wa", "fl"],
      expected: {
        dcType: { dcid: "State", displayName: "State" },
        dcProperty: {
          dcid: "fips52AlphaCode",
          displayName: "US State Alpha Code",
        },
      },
    },
    {
      name: "fipsCode",
      colArray: ["01", "02", "04", "48", "49", "50", "36", "28", "30"],
      expected: {
        dcType: { dcid: "State", displayName: "State" },
        dcProperty: {
          dcid: "geoId",
          displayName: "FIPS Code",
        },
      },
    },
    {
      name: "fips52AlphaCode-detection-with-null",
      colArray: ["nm", "ny", "wy", "nj", "ct", "nd", "nh", "wa", "fl", null],
      expected: {
        dcType: { dcid: "State", displayName: "State" },
        dcProperty: {
          dcid: "fips52AlphaCode",
          displayName: "US State Alpha Code",
        },
      },
    },
    {
      name: "iso-no-detection", // No detection due to too many non-ISO codes.
      colArray: [
        "US-AA",
        "US-BB",
        "US-CC",
        "US-DD",
        "US-EE",
        "US-FF",
        "US-RR",
        "US-KK",
        "US-MI",
        "US-ID",
      ],
      expected: null,
    },
  ];
  for (const c of cases) {
    if (c.expected == null) {
      expect(det.detect("", c.colArray)).toBe(null);
      continue;
    }
    expect(det.detect("state in col header", c.colArray)).toStrictEqual({
      detectedTypeProperty: c.expected,
      confidence: ConfidenceLevel.High,
    });
  }
});

test("placeDetection", () => {
  const det = new PlaceDetector();
  const colName = "country";

  // High Conf. State Detection.
  let colArray = ["US-CA", "US-WA", "US-PA"];
  let expectedHighConf = {
    detectedTypeProperty: {
      dcType: { dcid: "State", displayName: "State" },
      dcProperty: {
        dcid: "isoCode",
        displayName: "ISO Code",
      },
    },
    confidence: ConfidenceLevel.High,
  };
  expect(det.detect(colName, colArray)).toStrictEqual(expectedHighConf);

  // High Conf. Country Detection.
  colArray = ["USA", "NOR", "ITA"];
  expectedHighConf = {
    detectedTypeProperty: {
      dcType: { dcid: "Country", displayName: "Country" },
      dcProperty: { dcid: "countryAlpha3Code", displayName: "Alpha 3 Code" },
    },
    confidence: ConfidenceLevel.High,
  };

  expect(det.detect(colName, colArray)).toStrictEqual(expectedHighConf);

  // Modifying colArray to ensure country cannot be detected with high conf.
  // But it should be a low confidence detection due to the colName.
  colArray[0] = "randomString";
  colArray[1] = "randomString";
  const expectedLowConf = {
    detectedTypeProperty: {
      dcType: { dcid: "Country", displayName: "Country" },
    },
    confidence: ConfidenceLevel.Low,
  };
  expect(det.detect(colName, colArray)).toStrictEqual(expectedLowConf);

  // Now, use a column name which is not found to result in no detection.
  expect(det.detect("", colArray)).toStrictEqual(null);
});

test("countryNumericVsStateFIPS", () => {
  const det = new PlaceDetector();

  // Column has values which can be Numeric Codes for countries or
  // FIPS codes for US States.
  const colArray = ["36", "40", "50", "60"];

  // If the column header is no helpful information, detection should give
  // preference to Country.
  let header = "nothing helpful";
  let expectedHighConf = {
    detectedTypeProperty: {
      dcType: { dcid: "Country", displayName: "Country" },
      dcProperty: {
        dcid: "countryNumericCode",
        displayName: "Numeric Code",
      },
    },
    confidence: ConfidenceLevel.High,
  };
  expect(det.detect(header, colArray)).toStrictEqual(expectedHighConf);

  // If the column header contains "country", detection should still give
  // preference to Country.
  header = "something that has country in it";
  expect(det.detect(header, colArray)).toStrictEqual(expectedHighConf);

  // If the column header contains "state", detection should give preference to
  // US State.
  header = "Something with State in it";
  expectedHighConf = {
    detectedTypeProperty: {
      dcType: { dcid: "State", displayName: "State" },
      dcProperty: {
        dcid: "geoId",
        displayName: "FIPS Code",
      },
    },
    confidence: ConfidenceLevel.High,
  };
  expect(det.detect(header, colArray)).toStrictEqual(expectedHighConf);
});
