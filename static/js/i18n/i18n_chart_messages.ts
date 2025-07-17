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
      "Label for the button that copies the chart values to the clipboard when clicked. ",
  },
});
