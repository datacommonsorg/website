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

// Strings to use in the chart tile components & web components
export const tileMessages = defineMessages({
  loading: {
    id: "loading",
    defaultMessage: "Loading...",
    description:
      "Loading indicator displayed when chart visualizations are loading",
  },
  viaGoogle: {
    id: "viaGoogle",
    defaultMessage: "via Google",
    description: "Indicator displayed when chart data comes from Google",
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
});
