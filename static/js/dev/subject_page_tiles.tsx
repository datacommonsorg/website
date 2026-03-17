/**
 * Copyright 2026 Google LLC
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

import { ThemeProvider } from "@emotion/react";
import React from "react";
import ReactDOM from "react-dom";

import { Category } from "../components/subject_page/category";
import { loadLocaleData } from "../i18n/i18n";
import { NamedTypedPlace } from "../shared/types";
import theme from "../theme/theme";
import { CategoryConfig } from "../types/subject_page_proto_types";

const MOCK_CONFIG: CategoryConfig = {
  title: "[Category Title] About California (DCID: geoId/06)",
  statVarSpec: {
    Count_Person: {
      statVar: "Count_Person",
      name: "Population",
      denom: "",
      unit: "",
      scaling: 1,
      log: false,
    },
    Count_Person_Female: {
      statVar: "Count_Person_Female",
      name: "Female Population",
      denom: "",
      unit: "",
      scaling: 1,
      log: false,
    },
    Count_Person_Male: {
      statVar: "Count_Person_Male",
      name: "Male Population",
      denom: "",
      unit: "",
      scaling: 1,
      log: false,
    },
    Median_Age_Person: {
      statVar: "Median_Age_Person",
      name: "Median Age",
      denom: "",
      unit: "years",
      scaling: 1,
      log: false,
    },
  },
  blocks: [
    {
      columns: [
        {
          tiles: [
            {
              type: "HIGHLIGHT",
              title: "Sample Highlight Tile",
              description: "Population: ${date}",
              statVarKey: ["Count_Person"],
            },
            {
              type: "MAP",
              title: "Sample Map Tile",
              description: "Map View",
              statVarKey: ["Count_Person"],
            },
            {
              type: "LINE",
              title: "Sample Line Chart Tile",
              description: "Line Chart",
              statVarKey: ["Count_Person"],
            },
            {
              type: "BAR",
              title: "Sample Bar Chart Tile",
              description: "Bar Chart",
              statVarKey: ["Count_Person"],
            },
            {
              type: "RANKING",
              title: "Sample Ranking Tile",
              description: "Ranking",
              statVarKey: ["Count_Person"],
              rankingTileSpec: {
                showHighest: true,
                showLowest: true,
              },
            },
            {
              type: "SCATTER",
              title: "Sample Scatter Plot Tile",
              description: "Scatter Plot",
              statVarKey: ["Count_Person", "Median_Age_Person"],
            },
            {
              type: "BIVARIATE",
              title: "Sample Bivariate Map Tile",
              description: "Bivariate Map",
              statVarKey: ["Count_Person", "Median_Age_Person"],
            },
            {
              type: "GAUGE",
              title: "Sample Gauge Tile",
              description: "Gauge",
              statVarKey: ["Median_Age_Person"],
              gaugeTileSpec: { range: { min: 0, max: 100 } },
            },
            {
              type: "DONUT",
              title: "Sample Donut Tile",
              description: "Donut",
              statVarKey: ["Count_Person_Female", "Count_Person_Male"],
            },
            {
              type: "DESCRIPTION",
              title: "Sample Description Tile",
              description: "This is a descriptive tile.",
              statVarKey: [],
            },
            {
              type: "PLACE_OVERVIEW",
              title: "Sample Place Overview Tile",
              description: "Place Overview",
              statVarKey: [],
            },
          ],
        },
      ],
    },
  ],
};

const MOCK_PLACE: NamedTypedPlace = {
  dcid: "geoId/06",
  name: "California",
  types: ["State"],
};

class SubjectPageTilesDevPage extends React.Component {
  render(): JSX.Element {
    return (
      <ThemeProvider theme={theme}>
        <Category
          id="subject-page-tiles-cat"
          config={MOCK_CONFIG}
          place={MOCK_PLACE}
          enclosedPlaceType="County"
          eventTypeSpec={{}}
          svgChartHeight={200}
        />
      </ThemeProvider>
    );
  }
}

window.addEventListener("load", (): void => {
  loadLocaleData("en", [import("../i18n/compiled-lang/en/units.json")]).then(
    () => {
      ReactDOM.render(
        React.createElement(SubjectPageTilesDevPage),
        document.getElementById("subject-page-tiles-container")
      );
    }
  );
});
