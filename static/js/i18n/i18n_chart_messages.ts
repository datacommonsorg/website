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

export const chartComponentMessages = defineMessages({
  ApiDialogButtonText: {
    id: "apiDialogButtonText",
    defaultMessage: "API code",
    description:
      "Label for button to open a dialog to view and copy API endpoints calls.",
  },
  ApiDialogTitle: {
    id: "apiDialogTitle",
    defaultMessage: "API code",
    description:
      "Label for the title of the dialog to view and copy API endpoints calls.",
  },
  ApiDialogIntroduction: {
    id: "apiDialogIntroduction",
    defaultMessage:
      "Use the REST V2 API code below to access this data in JSON format. To get started, <apiKeyLink>obtain an API key</apiKeyLink> and replace the {apiKeyPlaceholder} placeholder with your actual key. For more details, check the <apiDocsLink>API documentation</apiDocsLink>.",
    description:
      "Introduction text for the API dialog, explaining how to use the code snippets and linking to documentation.",
  },
  ApiDialogIntroductionCustomDc: {
    id: "apiDialogIntroductionCustomDc",
    defaultMessage:
      "Use the REST V2 API code below to access this data in JSON format. For more details, check the <apiDocsLink>API documentation</apiDocsLink>.",
    description:
      "Introduction text for the API dialog, explaining how to use the code snippets and linking to documentation. " +
      "This version is used for custom Data Commons instances, where no API key is required.",
  },
  ApiDialogCopy: {
    id: "apiCopy",
    defaultMessage: "Copy",
    description:
      "Label for button to that will copy a single endpoint to the clipboard.",
  },
  ApiDialogCopyAll: {
    id: "apiCopyAll",
    defaultMessage: "Copy All",
    description:
      "Label for button to that will copy all endpoint calls to the clipboard. " +
      "This will display when there is more than one endpoint in the API dialog.",
  },
  ApiDialogDenomHelperText: {
    id: "apiDialogDenomHelperText",
    defaultMessage: "(for per capita calculations)",
    description:
      "The text that will display after a stat var name in API dialog, when " +
      "that stat var is used as a denom. The text should indicate that the " +
      "previous stat var is used for per capita calculations.",
  },
  ChartDownloadDialogTitle: {
    id: "chartDownloadDialogTitle",
    defaultMessage: "Download this chart",
    description:
      "Label for the title of the dialog for downloading chart data.",
  },
  DownloadSVG: {
    id: "downloadSVG",
    defaultMessage: "SVG",
    description: "Label for the button that will download the chart image.",
  },
  DownloadCSV: {
    id: "downloadCSV",
    defaultMessage: "CSV",
    description: "Label for the button that will download the data as a CSV.",
  },
  CopyValues: {
    id: "copyValues",
    defaultMessage: "Copy values",
    description:
      "Label for the button that copies the chart values to the clipboard when clicked.",
  },
  DataError: {
    id: "dataError",
    defaultMessage: "Error fetching data.",
    description: "Error message for no when the CSV data fetch fails.",
  },
  PerCapitaLabel: {
    id: "perCapitaLabel",
    defaultMessage: "Per capita",
    description: "Label for the per capita option in the chart.",
  },
  perCapitaLowercase: {
    id: "perCapita.lowercase",
    defaultMessage: "per capita",
    description:
      "Suffix added to chart Y-axis labels and tooltips to indicate the value is a per capita calculation.",
  },
  SnapToDateHighestCoverageLabel: {
    id: "snap-to-latest-data-checkbox-label",
    defaultMessage: "Snap to date with highest coverage",
    description:
      "Checkbox label for an option that tells a chart visualization to show the latest data available.",
  },
  SnapToDateHighestCoverageTooltip: {
    id: "snap-to-latest-data-help-tooltip",
    defaultMessage:
      "'Snap to date with highest coverage' shows the most recent data with maximal coverage. Some places might be missing due to incomplete reporting that year.",
    description:
      "Informational message for a checkbox titled 'Snap to date with highest coverage' that adjusts what data " +
      "is displayed in a chart.",
  },
  SnapToDateHighestCoverageOverlapTooltip: {
    id: "snap-to-latest-data-overlap-help-tooltip",
    defaultMessage:
      "The highest coverage data is also the latest data available for this chart.",
    description:
      "Informational message for a disabled checkbox titled 'Snap to date with highest coverage' that adjusts what " +
      "data is displayed in a chart. The message is explaining that the checkbox is disabled because the highest " +
      "coverage data overlaps with the most recent data available.",
  },
});
