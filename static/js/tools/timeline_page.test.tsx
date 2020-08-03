jest.mock("axios");
jest.mock("../chart/draw");

import Enzyme, { mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { when } from "jest-when";

import React from "react";
import axios from "axios";
import * as d3 from "d3";

import { Page } from "./timeline_page";
import { drawGroupLineChart } from "../chart/draw";
import hierarchy from "../../data/hierarchy_top.json";

Enzyme.configure({ adapter: new Adapter() });

const globalAny: any = global;

test("Single place and single stats var", () => {
  globalAny.window = Object.create(window);
  document.body.innerHTML = '<button id="download-link"></div>';
  // Set url hash
  Object.defineProperty(window, "location", {
    value: {
      hash: "&place=geoId/05&statsVar=Median_Age_Person",
    },
  });
  // Mock drawGroupLineChart() as getComputedTextLength can has issue with jest
  // and jsdom.
  (drawGroupLineChart as jest.Mock).mockImplementation(
    (
      selector: string | HTMLDivElement
      // width: number,
      // height: number,
      // statsVarsTitle: { [key: string]: string },
      // dataGroupsDict: { [place: string]: DataGroup[] },
      // plotParams: PlotParams,
      // source?: string[],
      // unit?: string
    ) => {
      let container: d3.Selection<any, any, any, any>;
      if (typeof selector === "string") {
        container = d3.select("#" + selector);
      } else if (selector instanceof HTMLDivElement) {
        container = d3.select(selector);
      } else {
        return;
      }
      container.selectAll("svg").remove();

      const svg = container
        .append("svg")
        .attr("width", 500)
        .attr("height", 500);
      svg.append("text").text("svg text");
    }
  );

  // Mock all the async axios call.
  axios.get = jest.fn();
  // get stats.
  when(axios.get)
    .calledWith("/api/stats/Median_Age_Person?&dcid=geoId/05")
    .mockResolvedValue({
      data: {
        "geoId/05": {
          place_dcid: "geoId/05",
          place_name: "Arkansas",
          provenance_domain: "census.gov",
          data: { "2011": 37.3, "2012": 37.4, "2013": 37.5, "2014": 37.6 },
        },
      },
    });
  // get hierachy.json
  when(axios.get)
    .calledWith("../../data/hierarchy_statsvar.json")
    .mockResolvedValue({ data: hierarchy });
  // get statsvar properties
  when(axios.get)
    .calledWith("/api/stats/stats-var-property?dcid=Median_Age_Person")
    .mockResolvedValue({
      data: {
        Median_Age_Person: { md: "", mprop: "age", pt: "Person", pvs: {} },
      },
    });
  // get place stats vars
  when(axios.get)
    .calledWith("/api/place/statsvars/geoId/05")
    .mockResolvedValue({ data: ["Count_Person", "Median_Age_Person"] });
  // get place names
  when(axios.get)
    .calledWith("/api/place/name?dcid=geoId/05")
    .mockResolvedValue({ data: { "geoId/05": "Place" } });

  // Do the actual render!
  const wrapper = mount(<Page search={true} />);

  // There are 3 promises to resolve:
  // 1) all for [statsVarInfo, placeName, validStatsVar]
  // 2) get hierachy.json
  // 3) get stats
  return Promise.resolve(wrapper)
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => {
      wrapper.update();
      expect(wrapper.find("#chart-region").getDOMNode().innerHTML).toEqual(
        `<div class="card"><div class="chart-svg"></div><div>` +
          `<div class="pv-chip mdl-chip--deletable">` +
          `<span class="mdl-chip__text">Median age</span>` +
          `<button class="mdl-chip__action"><i class="material-icons">` +
          `cancel</i></button></div></div></div>`
      );
    });
});
