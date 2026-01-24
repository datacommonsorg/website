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

import { getStandardizedToolUrl, getVisTypeFromHash } from "./redirect_utils";

// Placeholder hostname for constructing test URLs
const MOCK_HOSTNAME = "http://mockhost:0000";

describe("redirect_utils", () => {
  // Store the original window.location object
  const originalLocation = window.location;

  afterAll(() => {
    // Reset the original window.location for future tests
    window.location.href = originalLocation.href;
  });

  // Mocks window.location with a new URL for the given relative path
  // Deletes original read-only window.location and replaces with a
  // writeable mock object.
  const mockWindowLocation = (relativePath: string): void => {
    // Use type assertion to allow deleting a read-only property
    delete (window as Partial<Window>).location;

    // Create a writeable mock window.location
    const url = new URL(relativePath, MOCK_HOSTNAME);
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...originalLocation,
        href: url.href,
        pathname: url.pathname,
        hash: url.hash,
      },
    });
  };

  describe("getStandardizedToolUrl", () => {
    // Get hash parameters and values as an object for easier comparison
    const getHashObject = (relativePath: string): Record<string, string> => {
      const url = new URL(relativePath, MOCK_HOSTNAME);
      const hashString = url.hash.replace("#", "");
      const hashParams = new URLSearchParams(decodeURIComponent(hashString));
      const hashObj: Record<string, string> = {};
      hashParams.forEach((value, key) => {
        hashObj[key] = value;
      });
      return hashObj;
    };

    // Get the pathname of the given relative URL
    const getPathname = (relativePath: string): string => {
      return new URL(relativePath, MOCK_HOSTNAME).pathname;
    };

    type UrlTestCase = {
      description: string; // Test description to show in output
      originalPath: string; // Relative path to convert
      expectedPath: string; // Expected relative path output
    };

    const testCases: UrlTestCase[] = [
      // Map tool cases
      {
        description: "landing page should redirect to map tool",
        originalPath: "/tools/visualization",
        expectedPath: "/tools/map",
      },
      {
        description: "empty hash should redirect to map tool",
        originalPath: "/tools/visualization#",
        expectedPath: "/tools/map",
      },
      {
        description: "map landing page should redirect to map tool",
        originalPath: "/tools/visualization#visType=map",
        expectedPath: "/tools/map",
      },
      {
        description:
          "when redirecting to the map tool, ignore invalid hash parameters",
        originalPath:
          "/tools/visualization#visType=map&invalid_hash_param=invalid_value&place=country/USA",
        expectedPath: "/tools/map#pd=country/USA",
      },
      {
        description: "map chart with place, place type, and variable",
        originalPath:
          "/tools/visualization#visType%3Dmap%26place%3Dcountry%2FUSA%26placeType%3DCounty%26sv%3D%7B%22dcid%22%3A%22Median_Age_Person%22%7D",
        expectedPath:
          "/tools/map#sv=Median_Age_Person&pd=country/USA&ept=County",
      },
      {
        description:
          "map chart with place, place type, variable, and per capita is on",
        originalPath:
          "/tools/visualization#visType%3Dmap%26place%3Dcountry%2FUSA%26placeType%3DCounty%26sv%3D%7B%22dcid%22%3A%22Count_Person_EducationalAttainmentBachelorsDegreeOrHigher%22%2C%22pc%22%3A%221%22%7D",
        expectedPath:
          "/tools/map#sv=Count_Person_EducationalAttainmentBachelorsDegreeOrHigher&pc=1&pd=country/USA&ept=County",
      },
      {
        description:
          "unencoded map chart with place, place type, variable, and per capita",
        originalPath:
          '/tools/visualization#visType=map&place=country/USA&placeType=County&sv={"dcid":"Count_Person_EducationalAttainmentBachelorsDegreeOrHigher","pc":"1"}',
        expectedPath:
          "/tools/map#sv=Count_Person_EducationalAttainmentBachelorsDegreeOrHigher&pc=1&pd=country/USA&ept=County",
      },
      // Scatter tool cases
      {
        description: "scatter landing page should redirect to scatter tool",
        originalPath: "/tools/visualization#visType=scatter",
        expectedPath: "/tools/scatter",
      },
      {
        description:
          "when redirecting to the scatter tool, ignore invalid hash parameters",
        originalPath:
          "/tools/visualization#visType=scatter&invalid_hash_param=invalid_value&place=country/USA",
        expectedPath: "/tools/scatter#epd=country/USA&dd=1",
      },
      {
        description:
          "scatter chart with place, place type, and 2 variables, with per capita on Y axis",
        originalPath:
          "/tools/visualization#visType%3Dscatter%26place%3Dcountry%2FUSA%26placeType%3DCounty%26sv%3D%7B%22dcid%22%3A%22Count_Person_BelowPovertyLevelInThePast12Months%22%2C%22pc%22%3A%221%22%7D___%7B%22dcid%22%3A%22Mean_SolarInsolation%22%7D",
        expectedPath:
          "/tools/scatter#svx=Mean_SolarInsolation&svy=Count_Person_BelowPovertyLevelInThePast12Months&pcy=true&epd=country/USA&ept=County&dd=1",
      },
      {
        description:
          "scatter chart with place, place type, and 2 variables, with per capita on both axes",
        originalPath:
          "/tools/visualization#visType%3Dscatter%26place%3DgeoId%2F06%26placeType%3DCounty%26sv%3D%7B%22dcid%22%3A%22Count_Person_EducationalAttainmentBachelorsDegree%22%2C%22pc%22%3A%221%22%7D___%7B%22dcid%22%3A%22Count_Person_Female%22%2C%22pc%22%3A%221%22%7D",
        expectedPath:
          "/tools/scatter#svx=Count_Person_Female&pcx=true&svy=Count_Person_EducationalAttainmentBachelorsDegree&pcy=true&epd=geoId/06&ept=County&dd=1",
      },
      {
        description: "scatter chart with log scale, quadrants, and labels on",
        originalPath:
          "/tools/visualization#visType%3Dscatter%26place%3DgeoId%2F56%26placeType%3DCounty%26sv%3D%7B%22dcid%22%3A%22Count_Person_EducationalAttainmentBachelorsDegree%22%2C%22pc%22%3A%221%22%2C%22log%22%3A%221%22%7D___%7B%22dcid%22%3A%22Count_Person_Female%22%2C%22pc%22%3A%221%22%7D%26display%3D%7B%22l%22%3A%221%22%2C%22q%22%3A%221%22%7D",
        expectedPath:
          "/tools/scatter#svx=Count_Person_Female&pcx=true&svy=Count_Person_EducationalAttainmentBachelorsDegree&ly=1&pcy=true&epd=geoId/56&ept=County&qd=1&ld=1&dd=1",
      },
      {
        description:
          "unencoded scatter chart with log scale, quadrants, and labels on",
        originalPath:
          '/tools/visualization#visType=scatter&place=geoId/56&placeType=County&sv={"dcid":"Count_Person_EducationalAttainmentBachelorsDegree","pc":"1","log":"1"}___{"dcid":"Count_Person_Female","pc":"1"}&display={"l":"1","q":"1"}',
        expectedPath:
          "/tools/scatter#svx=Count_Person_Female&pcx=true&svy=Count_Person_EducationalAttainmentBachelorsDegree&ly=1&pcy=true&epd=geoId/56&ept=County&qd=1&ld=1&dd=1",
      },
      // Timeline tool cases
      {
        description: "timeline landing page should redirect to timeline tool",
        originalPath: "/tools/visualization#visType=timeline",
        expectedPath: "/tools/timeline",
      },
      {
        description:
          "when redirecting to the timeline tool, ignore invalid hash parameters",
        originalPath:
          "/tools/visualization#visType=timeline&invalid_hash_param=invalid_value&place=country/USA",
        expectedPath: "/tools/timeline#place=country/USA",
      },
      {
        description: "timeline chart with one place and multiple variables",
        originalPath:
          "/tools/visualization#visType%3Dtimeline%26place%3DgeoId%2F06%26sv%3D%7B%22dcid%22%3A%22WithdrawalRate_Water_Irrigation%22%7D___%7B%22dcid%22%3A%22WithdrawalRate_Water_Irrigation_FreshWater_GroundWater%22%7D___%7B%22dcid%22%3A%22WithdrawalRate_Water_Irrigation_SurfaceWater%22%7D",
        expectedPath:
          "/tools/timeline#place=geoId/06&statsVar=WithdrawalRate_Water_Irrigation__WithdrawalRate_Water_Irrigation_FreshWater_GroundWater__WithdrawalRate_Water_Irrigation_SurfaceWater",
      },
      {
        description: "timeline chart with one variable and multiple places",
        originalPath:
          "/tools/visualization#visType%3Dtimeline%26place%3DgeoId%2F06085___geoId%2F06025%26sv%3D%7B%22dcid%22%3A%22Median_Income_Person%22%7D",
        expectedPath:
          "/tools/timeline#place=geoId/06085,geoId/06025&statsVar=Median_Income_Person",
      },
      {
        description:
          "unencoded timeline chart with one variable and multiple places",
        originalPath:
          '/tools/visualization#visType=timeline&place=geoId/06085___geoId/06025&sv={"dcid":"Median_Income_Person"}',
        expectedPath:
          "/tools/timeline#place=geoId/06085,geoId/06025&statsVar=Median_Income_Person",
      },
    ];

    test.each(testCases)(
      "should return correct url for $description",
      ({ originalPath, expectedPath }) => {
        mockWindowLocation(originalPath);
        const resultPath = getStandardizedToolUrl();
        expect(getPathname(resultPath)).toEqual(getPathname(expectedPath));
        expect(getHashObject(resultPath)).toEqual(getHashObject(expectedPath));
      }
    );
  });

  describe("getVisTypeFromHash", () => {
    type VisTypeHashTestCase = {
      hash: string; // URL hash string to test
      expected: "map" | "scatter" | "timeline"; // Expected visType
      description: string; // Test description to show in output
    };

    const testCases: VisTypeHashTestCase[] = [
      { hash: "", expected: "map", description: "an empty hash" },
      { hash: "#", expected: "map", description: "a hash with no params" },
      {
        hash: "#visType=scatter",
        expected: "scatter",
        description: "a scatter visType",
      },
      {
        hash: "#visType=timeline",
        expected: "timeline",
        description: "a timeline visType",
      },
      {
        hash: "#visType=map",
        expected: "map",
        description: "a map visType",
      },
      {
        hash: "#foo=bar&visType=timeline",
        expected: "timeline",
        description: "visType is the last hash parameter",
      },
      {
        hash: "#foo=bar&visType=scatter&bar=foo",
        expected: "scatter",
        description: "visType is the a middle hash parameter",
      },
      {
        hash: "#visType=invalidType",
        expected: "map",
        description: "an invalid visType should default to map",
      },
    ];

    test.each(testCases)(
      'should return "$expected" for $description',
      ({ hash, expected }) => {
        mockWindowLocation(hash);
        expect(getVisTypeFromHash()).toBe(expected);
      }
    );
  });
});
