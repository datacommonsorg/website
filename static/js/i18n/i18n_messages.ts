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

import { defineMessages } from "react-intl";

// Strings to use in header
export const messages = defineMessages({
  loading: {
    id: "loading",
    defaultMessage: "Loading...",
    description:
      "Loading indicator displayed when chart visualizations are loading",
  },
  viaGoogle: {
    id: "viaGoogle",
    defaultMessage: "via Google",
    description:
      'Indicator displayed when chart data comes from Google. Example "Source: www2.census.gov via Google"',
  },
  sources: {
    id: "sources",
    defaultMessage: "Sources",
    description:
      "Title indicating that the chart data comes from the following multiple sources",
  },
  source: {
    id: "source",
    defaultMessage: "Source",
    description:
      "Title indicating that the chart data comes from the following single source",
  },
  metadata: {
    id: "metadata",
    defaultMessage: "Metadata",
    description:
      "Title for metadata section (such as in dialog), akin to definition here https://en.wikipedia.org/wiki/Metadata",
  },
  showMetadata: {
    id: "showMetadata",
    defaultMessage: "Show metadata",
    description: "Link to show source metadata for the chart",
  },
  chooseVariable: {
    id: "chooseVariable",
    defaultMessage: "Choose a variable to view its metadata",
    description:
      "Title for the metadata modal showing the list of variables to show source information for",
  },
  selectVariable: {
    id: "selectVariable",
    defaultMessage:
      "Select a variable from the list to see its details. The links below open the Statistical Variable Explorer in a new tab.",
    description:
      "Subtitle for the metadata modal showing the list of variables to show source information for",
  },
  close: {
    id: "close",
    defaultMessage: "Close",
    description: "Button to close the metadata modal",
  },
  download: {
    id: "download",
    defaultMessage: "Download",
    description: "Button to download data from the chart",
  },
  exploreLink: {
    id: "exploreLink",
    defaultMessage: "Explore in {toolName}",
    description: "Link to explore the chart in a specific tool",
  },
  timelineTool: {
    id: "timelineTool",
    defaultMessage: "Timeline Tool",
    description: "Title for the timeline tool",
  },
  mapTool: {
    id: "mapTool",
    defaultMessage: "Map Tool",
    description: "Title for the map tool",
  },
  disasterTool: {
    id: "disasterTool",
    defaultMessage: "Disaster Tool",
    description: "Title for the disaster tool",
  },
  scatterTool: {
    id: "scatterTool",
    defaultMessage: "Scatter Tool",
    description: "Title for the scatter tool",
  },
  rankingTileLatestDataFooter: {
    defaultMessage:
      "This ranking includes data from several years for a comprehensive view of places.",
    description:
      "Description of a chart that shows data points from various years.",
    id: "ranking-tile-latest-data-footer",
  },
  rankingTileLatestDataAvailableFooter: {
    defaultMessage:
      "Ranking based on latest data available. Some places may be missing due to incomplete reporting that year.",
    description:
      "Description of a chart that shows the most recently available data.",
    id: "ranking-tile-latest-data-available-footer",
  },
  seePerCapita: {
    id: "seePerCapita",
    defaultMessage: "See per capita",
    description: "Checkbox label text for option that toggles per capita data",
  },
  dateRange: {
    id: "dateRange",
    defaultMessage: "{minDate} to {maxDate}",
    description:
      'Date range for a chart title. For example: "2010 to 2020". Please leave the variables {minDate} and {maxDate} unchanged in the translated message.',
  },
  enterQuery: {
    id: "enterQuery",
    defaultMessage: "Enter a question to explore",
    description:
      "Placeholder text for the Data Commons search bar query input field",
  },
  perCapitaErrorMessage: {
    id: "perCapitaErrorMessage",
    defaultMessage: "Could not calculate per capita.",
    description: "Error message for per capita calculation",
  },
  noDataErrorMessage: {
    id: "noDataErrorMessage",
    defaultMessage: "No data available.",
    description: "Error message for no data available",
  },
});
