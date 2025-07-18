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

export const visualizationToolMessages = defineMessages({
  switchToolVersion: {
    id: "switch_tool_version",
    defaultMessage: "Switch tool version",
    description:
      "label on button allowing users to switch to an earlier version of our tools",
  },
  mapToolTitle: {
    id: "map_visualization_tool_name",
    defaultMessage: "Map Explorer",
    description: "name of the tool that plots maps",
  },
  mapToolSubtitle: {
    id: "map_visualization_tool_description",
    defaultMessage:
      "The map explorer helps you visualize how a statistical variable can vary across geographic regions.",
    description: "a description of what our map explorer tool is used for",
  },
  scatterToolTitle: {
    id: "scatter_visualization_tool_name",
    defaultMessage: "Scatter Plot Explorer",
    description: "name of the tool that plots scatter plot charts",
  },
  scatterToolSubtitle: {
    id: "scatter_visualization_tool_description",
    defaultMessage: `The scatter plot explorer helps you visualize the correlation between two statistical variables.`,
    description:
      "a description of what our scatter plot explorer tool is used for",
  },
  timelineToolTitle: {
    id: "timeline_visualization_tool_name",
    defaultMessage: "Timelines Explorer",
    description:
      "name of the tool that plots line charts, specifically a variable over time",
  },
  timelineToolSubtitle: {
    id: "scatter_visualization_tool_description",
    defaultMessage:
      "The timelines explorer helps you explore trends for statistical variables.",
    description:
      "a description of what our timelines explorer tool is used for",
  },
});
