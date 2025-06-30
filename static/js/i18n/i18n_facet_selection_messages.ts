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

export const facetSelectionComponentMessages = defineMessages({
  DatasetError: {
    id: "datasetError",
    defaultMessage: "Error loading datasets for selection.",
    description:
      "Message shown when the call to get available datasets failed.",
  },
  SelectDataset: {
    id: "selectDataset",
    defaultMessage: "Select a dataset",
    description:
      "Label for button and related dialog that allows the user to select a dataset. This text " +
      "is used when there is a single stat vars. A dataset here refers to the facet used to " +
      "supply data to the chart.",
  },
  SelectDatasets: {
    id: "selectDatasets",
    defaultMessage: "Select datasets",
    description:
      "Label for button and related dialog that allows the user to select datasets. This text " +
      "is used when there are multiple stat vars. A dataset here refers to the facet used to " +
      "supply data to the chart.",
  },
  NoAlternativeDatasets: {
    id: "noAlternativeDatasets",
    defaultMessage: "Only 1 dataset available",
    description:
      "Text displayed in place of the dataset select button when no stat var has more than " +
      "one dataset associated with it, and therefore there is nothing for the user to select. ",
  },
  SelectDatasetForDownloadPromptMessage: {
    id: "selectDatasetForDownloadPromptMessage",
    defaultMessage:
      "Select the data source that you would like to use to download the data for",
    description:
      "Prompt message that appears in the dataset selection dialog, introducing the list of " +
      "facets that the user can choose from. This will be used when choosing data to download.",
  },
  SelectDatasetsForDownloadPromptMessage: {
    id: "selectDatasetsForDownloadPromptMessage",
    defaultMessage:
      "Select the data sources that you would like to use to download the data",
    description:
      "Prompt message that appears in the dataset selection dialog when there are multiple stat " +
      "vars, each introducing the list of facets that the user can choose from. This will be " +
      "used when choosing data to download.",
  },
  ExploreOtherDatasets: {
    id: "exploreOtherDatasets",
    defaultMessage: "Explore other datasets",
    description:
      "Label for button and related dialog that allows the user to select datasets. Note that the " +
      "wording covers both the situation where there is one stat var and multiple stat vars for " +
      "which the user will be able to select a dataset.",
  },
  ExploreOtherDatasetsSingleStatVarPromptMessage: {
    id: "ExploreOtherDatasetsSingleStatVarPromptMessage",
    defaultMessage: "Select the data source that you would like to use to plot",
    description:
      "Prompt message that appears in the dataset selection dialog, introducing the list of " +
      "facets that the user can choose from. This will be used when choosing data to plot charts.",
  },
  ExploreOtherDatasetsMultipleStatVarsPromptMessage: {
    id: "ExploreOtherDatasetsMultipleStatVarsPromptMessage",
    defaultMessage:
      "Select the data sources that you would like to use to build the plot",
    description:
      "Prompt message that appears in the dataset selection dialog when there are multiple stat " +
      "vars, each introducing the list of facets that the user can choose from. This will be " +
      "used when choosing data to plot charts.",
  },
  Update: {
    id: "update",
    defaultMessage: "Update",
    description:
      "Text of action button at the bottom of the dataset selection dialog that updates the dataset " +
      "selection with the newly selected facet.",
  },
  CombinedDatasetForChartsOption: {
    id: "combinedDatasetForChartsOption",
    defaultMessage:
      "Plot data points by combining data from the datasets listed below for maximal coverage",
    description:
      "The first option that appears at the top of each respective list of facets connected to a stat var. " +
      "This option indicates that the various facets will be combined automatically to provide best " +
      "possible coverage. This will be used when choosing data to plot charts.",
  },
  CombinedDatasetForDownloadOption: {
    id: "combinedDatasetForDownloadOption",
    defaultMessage:
      "Combine data from the datasets listed below for maximal coverage",
    description:
      "The first option that appears at the top of each respective list of facets connected to a stat var. " +
      "This option indicates that the various facets will be combined automatically to provide best " +
      "possible coverage. This will be used when choosing data to download.",
  },
});
