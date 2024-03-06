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

import { describe, it, jest } from "@jest/globals";
import { act } from "@testing-library/react";
jest.mock("axios");

import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
import Cheerio from "cheerio";
import Enzyme, { mount } from "enzyme";
import React from "react";

import { App } from "./app";

Enzyme.configure({ adapter: new Adapter() });
/*
const mockedAxios = axios as jest.Mocked<typeof axios>;

function mockAxios(): void {
  mockedAxios.post.mockImplementation((url, options) => {
    if (url === "/api/place/name") {
      return Promise.resolve({
        data: {
          "NAICS/1": "Company 1",
          "NAICS/2": "Company 2",
          "NAICS/3": "Company 3",
          "NAICS/4": "Company 4",
        },
      });
    }
    console.log(
      "axios.post URL",
      url,
      "not handled.. returning empty response"
    );
    return Promise.resolve({});
  });

  mockedAxios.get.mockImplementation((url, options) => {
    if (url === "/api/observations/point/within") {
      return Promise.resolve({
        data: {
          data: {
            Count_Person: {},
            sector_property: {
              "NAICS/1": {
                date: "2023",
                facet: "local",
                value: 0.75,
              },
              "NAICS/2": {
                date: "2023",
                facet: "local",
                value: 0.25,
              },
              "NAICS/3": {
                date: "2023",
                facet: "local",
                value: 0.25,
              },
              "NAICS/4": {
                date: "2023",
                facet: "local",
                value: 0.75,
              },
            },
          },
          facets: {
            local: {
              importName: "local",
              provenanceUrl: "local",
            },
          },
        },
      });
    } else if (url === "/api/node/propvals/out") {
      return Promise.resolve({
        data: { sector_property: [] },
      });
    }
    console.log("axios.get URL", url, "not handled.. returning empty response");
    return Promise.resolve({});
  });
}
*/
describe("Explore App", () => {
  it("Should play it cool", async () => {
    // mockAxios();
    const wrapper = mount(<App isDemo={false} />);
    await act(async () => {
      await wrapper.update();
    });
    const $ = Cheerio.load(wrapper.html());
    console.log($("body").html());
  });
});
