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
  SnapToDateHighestCoverageLabel: {
    id: "snapToLatestDateHighestCoverageLabel",
    defaultMessage: "Snap to date with highest coverage",
    description:
      "Checkbox label for an option that tells a chart visualization to show the latest data available.",
  },
  SnapToDateHighestCoverageTooltip: {
    id: "snapToLatestDateHighestCoverageLabel",
    defaultMessage:
      "'Snap to date with highest coverage' shows the most recent data with maximal coverage. Some places might be missing due to incomplete reporting that year.",
    description:
      "Informational message for a checkbox titled 'Snap to date with highest coverage' that adjusts what data " +
      "is displayed in a chart.",
  },
  SnapToDateHighestCoverageOverlapTooltip: {
    id: "snapToLatestDateHighestCoverageLabel",
    defaultMessage:
      "The highest coverage data is also the latest data available for this chart.",
    description:
      "Informational message for a disabled checkbox titled 'Snap to date with highest coverage' that adjusts what " +
      "data is displayed in a chart. The message is explaining that the checkbox is disabled because the highest " +
      "coverage data overlaps with the most recent data available.",
  },
});
