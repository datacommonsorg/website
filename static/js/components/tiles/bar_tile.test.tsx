/**
 * Copyright 2020 Google LLC
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

//import { describe, expect, it, jest } from "@jest/globals";
import { describe, expect, it } from "@jest/globals";
import { act } from "@testing-library/react";
jest.mock("axios");
jest.mock("./use_draw_on_resize", () => ({
  useDrawOnResize: jest.fn((drawFn, el) => {
    if (el) {
      drawFn();
    }
  }),
}));

import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
import axios from "axios";
import Cheerio from "cheerio";
import Enzyme, { mount } from "enzyme";
import React from "react";

import { BarTile } from "./bar_tile";

Enzyme.configure({ adapter: new Adapter() });
const mockedAxios = axios as jest.Mocked<typeof axios>;

declare global {
  interface SVGElement {
    getComputedTextLength(): number;
    getBBox(): {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }
}

beforeAll(() => {
  SVGElement.prototype.getComputedTextLength = (): number => 100;
  SVGElement.prototype.getBBox = (): {
    x: number;
    y: number;
    width: number;
    height: number;
  } => ({ x: 1, y: 1, width: 1, height: 1 });
});

function mockAxios(): void {
  mockedAxios.post.mockImplementation((url) => {
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

  mockedAxios.get.mockImplementation((url) => {
    if (url === "/api/observations/point/within") {
      /* eslint-disable camelcase */
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
    /* eslint-enable camelcase */
    console.log("axios.get URL", url, "not handled.. returning empty response");
    return Promise.resolve({});
  });
}

describe("BarTile", () => {
  it("Bar tile with non-place entities should render", async () => {
    mockAxios();
    const wrapper = mount(
      <BarTile
        barHeight={200}
        className={"some-class"}
        id={"bar-id"}
        variables={[
          {
            denom: "",
            log: false,
            scaling: 1,
            statVar: "sector_property",
            unit: "",
          },
        ]}
        svgChartHeight={200}
        title={"Chart Title"}
        enclosedPlaceType={"NAICSEnum"}
        parentPlace={"NAICSEnum"}
      />
    );
    await act(async () => {
      await wrapper.update();
    });
    const $ = Cheerio.load(wrapper.html());
    // Ensure our 4x NAICS/* stat vars entities show up in the bar chart
    expect($('rect[part*="series-place-NAICS"]').toArray().length).toEqual(4);
  });
});
