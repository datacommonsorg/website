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

/**
 * @fileoverview dev_menu page.
 */

import React from "react";
import ReactDOM from "react-dom";
import { Page } from "./timeline.tsx";
import { updateUrlStatsVar } from "./timeline_util.js";
import { ChartRegion, ChartRegionPropsType } from "./timeline_chart";

window.onload = () => {
  ReactDOM.render(
    React.createElement(Page, { updateUrl: updateUrlStatsVar, search: false }),
    document.getElementById("main-pane")
  );

  let drawChartParams: ChartRegionPropsType;
  drawChartParams = {
    chartElem: "charts",
    placeIds: ["geoId/05", "geoId/06"],
    statVarsAndMeasuredProps: [
      ["Count_Person", "count"],
      ["Count_Person_Male", "count"],
      ["Median_Age_Person", "age"],
    ],
    perCapita: false,
  };

  ReactDOM.render(
    React.createElement(ChartRegion, drawChartParams),
    document.getElementById("charts")
  );
};
