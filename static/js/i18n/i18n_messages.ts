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
  sourcesLowercase: {
    id: "sources.lowercase",
    defaultMessage: "sources",
    description:
      "Same as “Sources” but in lowercase (for sentence-case labels)",
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
  cancel: {
    id: "cancel",
    defaultMessage: "Cancel",
    description:
      "Button to close a modal or other interactive element without applying changes",
  },
  close: {
    id: "close",
    defaultMessage: "Close",
    description:
      "Button to close a modal or other interactive element. Unlike 'Cancel', this does not imply abandoning " +
      "changes; it simply dismisses the dialog. It is used when there are no contrasting actions.",
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
  inPlacesAndLastPlace: {
    id: "in_places_and_last_place",
    defaultMessage: "in {places} and {lastPlace}",
    description:
      "Text to display when we have a list of places, and need to add 'and' before the last place. For example, 'California, Texas, and New York'.",
  },
  inPlace: {
    id: "in_place",
    defaultMessage: "in {place}",
    description:
      "Text to display when we have a single place, and need to add the 'in' before the place. For example, 'in California'.",
  },
  allAbout: {
    id: "all_about",
    defaultMessage: "All about {place}",
    description:
      "Text to display in the header section of explore page search results for a place that has no parent places. " +
      "For example 'All about World'. The {place} will be a link.",
  },
  allAboutPlaceInPlace: {
    id: "all_about_place_in_place",
    defaultMessage: "All about {place}, {lowercasePlaceType} in {parentPlaces}",
    description:
      "Text to display in the header section of explore page search results for a place that has parent places. " +
      "For example, for California, it shows 'All about California, state in USA, North America'.  The {place} and " +
      "each parent place will be a link. Select either {lowercasePlaceType} or {uppercasePlaceType}, as is " +
      "appropriate to the target language and position of the word in the translated sentence. Please leave the " +
      "{uppercasePlaceType} or {lowercasePlaceType} and {place} and {parentPlaces} variables unchanged in the " +
      "resulting translation.",
  },
  searchQuestionIntroduction: {
    id: "search_question_introduction",
    defaultMessage: "Data related to your research question",
    description:
      "Text that displays above the user-inputted query to introduce that query. For example, if the query " +
      "is 'How does health equity look in San Francisco', then the page will display: " +
      "Data related to your research question 'How does health equity look in San Francisco'",
  },
  explorePageOverviewTooltip: {
    id: "explore_page_overview_tooltip",
    defaultMessage:
      "This introduction was generated with Gemini. All charts and data are provided by the third-party sources cited on each visualization, with minor processing by Data Commons.",
    description:
      "Informational tooltip text for the explore page overview introducing the statistical variables. Summary is generated from the titles of each chart on the page.",
  },
});
