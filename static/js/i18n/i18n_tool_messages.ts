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
  mapToolTitle: {
    id: "map_visualization_tool_name",
    defaultMessage: "Map Explorer",
    description: "name of the tool that plots maps",
  },
  mapToolSubtitle: {
    id: "map_visualization_tool_description",
    defaultMessage:
      "The Map Explorer helps you visualize how a statistical variable can vary across geographic regions.",
    description: "a description of what our map explorer tool is used for",
  },
  mapToolGoBackMessage: {
    id: "map_tool_go_back_message",
    defaultMessage: "Go back to the new Map Explorer",
    description:
      "label on a button that takes the user to a newer version of the Map Explorer",
  },
  mapToolSearchBoxPlaceholder: {
    id: "map_tool_search_box_placeholder",
    defaultMessage: "Enter a country or state to get started",
    description:
      "Placeholder text in a search bar inviting the user to type in the name of a place",
  },
  scatterToolTitle: {
    id: "scatter_visualization_tool_name",
    defaultMessage: "Scatter Plot Explorer",
    description: "name of the tool that plots scatter plot charts",
  },
  scatterToolSubtitle: {
    id: "scatter_visualization_tool_description",
    defaultMessage: `The Scatter Plot Explorer helps you visualize the correlation between two statistical variables.`,
    description:
      "a description of what our scatter plot explorer tool is used for",
  },
  scatterToolGoBackMessage: {
    id: "scatter_tool_go_back_message",
    defaultMessage: "Go back to the new Scatter Plot Explorer",
    description:
      "label on a button that takes the user to a newer version of the Scatter Plot Explorer",
  },
  scatterToolScatterChartTypeTooltip: {
    id: "scatter_tool_scatter_chart_type_tooltip",
    defaultMessage:
      "Visualize the relationship between two statistical variables using a scatter plot",
    description:
      "Explanation of a chart type option that describes a scatter plot",
  },
  scatterToolBivariateChartTypeTooltip: {
    id: "scatter_tool_bivariate_chart_type_tooltip",
    defaultMessage:
      "Visualize the geographical co-location of two statistical variables using a bivariate map",
    description:
      "Explanation of a chart type option that describes a bivariate map plot",
  },
  timelineToolTitle: {
    id: "timeline_visualization_tool_name",
    defaultMessage: "Timelines Explorer",
    description:
      "name of the tool that plots line charts, specifically a variable over time",
  },
  timelineToolSubtitle: {
    id: "timeline_visualization_tool_description",
    defaultMessage:
      "The Timelines Explorer helps you explore trends for statistical variables.",
    description:
      "a description of what our timelines explorer tool is used for",
  },
  timelineToolGoBackMessage: {
    id: "timeline_tool_go_back_message",
    defaultMessage: "Go back to the new Timelines Explorer",
    description:
      "label on a button that takes the user to a newer version of the Timelines Explorer",
  },
  infoBoxInstructionsVariableDesktopTimeline: {
    id: "info_box_instruction_variable_desktop_timeline",
    defaultMessage: "Pick one or more statistical variables in the left pane.",
    description:
      "Instruction for users to interact with a UI element on the left side of the page.",
  },
  infoBoxInstructionsVariableMobileTimeline: {
    id: "info_box_instruction_variable_mobile_timeline",
    defaultMessage:
      'Pick one or more statistical variables using the "select variable" button above.',
    description:
      "An instruction for users to use a button labeled 'select variable' to select a statistical variable to plot",
  },
  infoBoxInstructionsVariableDesktopScatter: {
    id: "info_box_instruction_variable_desktop_scatter",
    defaultMessage: "Pick two statistical variables in the left pane.",
    description:
      "Instruction for users to interact with a UI element on the left side of the page.",
  },
  infoBoxInstructionsVariableMobileScatter: {
    id: "info_box_instruction_variable_mobile_scatter",
    defaultMessage:
      'Pick two statistical variables using the "select variable" button above.',
    description:
      "An instruction for users to use a button labeled 'select variable' to select a statistical variable to plot",
  },
  infoBoxInstructionsVariableDesktopMap: {
    id: "info_box_instruction_variable_desktop_map",
    defaultMessage: "Pick a statistical variable in the left pane.",
    description:
      "Instruction for users to interact with a UI element on the left side of the page.",
  },
  infoBoxInstructionsVariableMobileMap: {
    id: "info_box_instruction_variable_mobile_map",
    defaultMessage:
      'Pick a statistical variable using the "select variable" button above.',
    description:
      "An instruction for users to use a button labeled 'select variable' to select a statistical variable to plot",
  },
  statVarExplorerInstructionsDesktop: {
    id: "stat_var_explorer_instructions_desktop",
    defaultMessage: "To start, select a variable from the left pane.",
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
  ExamplesHeader: {
    id: "vis_tool_examples_header",
    defaultMessage: "Need ideas? Try these:",
    description:
      "Invitation for users to explore some example charts and visualizations.",
  },
  unsupportedEnclosedPlaceAlert: {
    id: "unsupported_enclosed_place_alert",
    defaultMessage:
      "Sorry, we don't support {placeName}. Please select a different place.",
    description:
      "Message to users that the place they selected is unsupported by our tool",
  },
  placeSearchBoxLabel: {
    id: "place_search_box_label",
    defaultMessage: "Location:",
    description: "Label on a text box that users type a place's name into",
  },
  enterPotentiallyMultiplePlacesInstruction: {
    id: "enter_potentially_multiple_places_instruction",
    defaultMessage: "Select place(s):",
    description:
      "An instruction for users to type one or many place's name into a text box",
  },
  placeTypeGranularityLabel: {
    id: "place_type_granularity_label",
    defaultMessage: "Breakdown by:",
    description:
      "part of the label on a form asking users to select a place type (e.g. city, country) to visualize data at that level of granularity (e.g. see population of USA by State)",
  },
  placeTypeDropdownPlaceholder: {
    id: "place_type_dropdown_placeholder",
    defaultMessage: "Select geographic level",
    description:
      "default value on a dropdown telling the user to select a place type from the given options",
  },
  selectAVariableInstruction: {
    id: "selectAVariableInstruction",
    defaultMessage: "Select variable",
    description:
      "Instruction inviting the user to select a statistical variable to plot",
  },
  selectMultipleVariablesInstruction: {
    id: "selectMultipleVariablesInstruction",
    defaultMessage: "Select variables",
    description:
      "Instruction inviting the user to select more than 1 statistical variable to plot",
  },
});

export const VisToolExampleChartMessages = defineMessages({
  waterWithdrawalRateInUsa: {
    id: "water_withdrawal_rate_in_the_usa",
    defaultMessage: "Water withdrawal rate in the USA",
    description:
      "Title of a map plotting the statistical variable 'water withdrawal rates' in US states.",
  },
  unemploymentRateInNewJersey: {
    id: "unemployment_rate_in_new_jersey",
    defaultMessage: "Unemployment rate in New Jersey",
    description:
      "Title of a map plotting the statistical variable 'unemployment rate' in counties of New Jersey",
  },
  medianIncomeInTexas: {
    id: "median_income_in_texas",
    defaultMessage: "Median Income in Texas",
    description:
      "Title of a map plotting the statistical variable 'median income' in counties of Texas",
  },
  attainmentOfBachelorDegreeInColorado: {
    id: "attainment_of_bachelor_degree_in_colorado",
    defaultMessage: "Attainment of bachelor's degree in Colorado",
    description:
      "Title of a map plotting the statistical variable 'bachelors degree attainment' for counties of Colorado",
  },
  coronaryHeartDiseaseVsProjectedTemperatureRise: {
    id: "prevalence_of_coronary_heart_disease_vs_projected_temperature_rise_in_the_usa",
    defaultMessage:
      "Prevalence of coronary heart disease vs. projected temperature rise in the USA",
    description:
      "Title of a scatter plot showing the correlation between coronary heart disease and projected temperature rise in the USA",
  },
  literatePopulationVsPopulationBelowPovertyLevel: {
    id: "literate_population_per_capita_vs_population_below_poverty_level_per_capita_for_states_in_india",
    defaultMessage:
      "Literate population per capita vs. population below poverty level per capita for states in India",
    description:
      "Title of a scatter plot showing the correlation between the literate population per capita and population below poverty level per capita for states in India",
  },
  waterWithdrawalRateInCalifornia: {
    id: "water_withdrawal_rate_in_california",
    defaultMessage: "Water withdrawal rate in California",
    description:
      "Title of a line chart plotting the statistical variable 'water withdrawal rate' in California",
  },
  universityTownsByIncome: {
    id: "university_towns_by_income",
    defaultMessage: "University towns by income",
    description:
      "Title of a line chart plotting the statistical variable 'income' in a set of towns known for having a university",
  },
  closeButDifferentBerkeleyAndPiedmont: {
    id: "close_but_different_berkeley_and_piedmont",
    defaultMessage:
      "Close but different: Quality of life indicators in Berkeley & Piedmont",
    description:
      "Title of a timeline showing the differences between Berkeley, USA and Piedmont, USA",
  },
  projectedTemperatureRiseInUsa: {
    id: "projected_temperature_rise_in_the_usa",
    defaultMessage: "Projected temperature rise in the USA",
    description:
      "Title of a map plotting the statistical variable 'projected temperature rise' in counties of the USA",
  },
  medianAgeInUsa: {
    id: "median_age_in_the_usa",
    defaultMessage: "Median age in the USA",
    description:
      "Title of a map plotting the statistical variable 'median age' in counties of the USA",
  },
  noSchoolingCompletedInUsa: {
    id: "no_schooling_completed_in_the_usa",
    defaultMessage: "Population with no schooling completed in the USA",
    description:
      "Title of a map plotting the statistical variable 'no schooling completed' in counties of the USA",
  },
  closeButDifferentPaloAltoAndEastPaloAlto: {
    id: "close_but_different_palo_alto_and_east_palo_alto",
    defaultMessage:
      "Close but different: Quality of life indicators in Palo Alto & East Palo Alto",
    description:
      "Title of a timeline showing the differences between Palo Alto and East Palo Alto",
  },
});
