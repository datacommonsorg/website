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

export const toolMessages = defineMessages({
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
  infoBoxInstructionHeader: {
    id: "info_box_instruction_header",
    defaultMessage: "Follow these steps:",
    description: "heading for a set of instructions on how to use our tools",
  },
  infoBoxInstructionsPlacesIn: {
    id: "info_box_instruction_places_in",
    defaultMessage:
      "Enter your desired location (e.g., California, Canada, Europe) into the search box above, and then select the type of sub-region (e.g., City, State, Country) you want to plot.",
    description:
      "instructions for how to enter the group of places to plot using our chart visualization tools, (e.g., plot cities in France).",
  },
  infoBoxInstructionsPlaces: {
    id: "info_box_instruction_places",
    defaultMessage:
      "Type your desired location(s) (e.g., London, Mexico, Africa) into the search box above, then select the place from the displayed results.",
    description:
      "instructions for how to enter a list of places to plot using our chart visualization tools",
  },
  infoBoxInstructionsVariableDesktop: {
    id: "info_box_instruction_variable_desktop",
    defaultMessage: "Pick a statistical variable in the left panel.",
    description:
      "An instruction for users to interact with a UI element on the left side of the page",
  },
  infoBoxInstructionsVariableMobile: {
    id: "info_box_instruction_variable_mobile",
    defaultMessage:
      'Pick a statistical variable using the "select variable" button above.',
    description:
      "An instruction for users to use a button labeled 'select variable' to select a statistical variable to plot",
  },
  infoBoxInstructionsMultiVariableDesktop: {
    id: "info_box_instruction_multi_variable_desktop",
    defaultMessage: "Pick statistical variables in the left panel.",
    description:
      "An instruction for users to interact with a UI element on the left side of the page to select multiple statistical variables",
  },
  infoBoxInstructionsMultiVariableMobile: {
    id: "info_box_instruction_multi_variable_mobile",
    defaultMessage:
      'Pick statistical variables using the "select variables" button above.',
    description:
      "An instruction for users to use a button labeled 'select variables' to select multiple statistical variable to plot",
  },
  statVarExplorerInstructionsDesktop: {
    id: "stat_var_explorer_instructions_desktop",
    defaultMessage: "To start, select a variable from the left panel.",
    description:
      "An instruction for users to interact with a UI element on the left side of the screen to select a variable to display in our statistical variable explorer tool",
  },
  statVarExplorerInstructionsMobile: {
    id: "stat_var_explorer_instructions_mobile",
    defaultMessage: 'To start, click the "Select variable" button below.',
    description:
      "An instruction for users to click on a button UI element to select a variable to display in our statistical variable explorer tool",
  },
  statVarExplorerInstructionsDataSource: {
    id: "stat_var_explorer_instructions_data_source",
    defaultMessage:
      "Need more specific data? Filter by choosing a data source above.",
    description:
      "An instruction for users to select a data source to use in our statistical variable explorer tool",
  },
});
