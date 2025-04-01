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

export const pageMessages = defineMessages({
  DataSources: {
    id: "data_sources",
    defaultMessage: "Data Sources",
    description:
      "Header text for the Data Sources page, a page that gives an overview of a place's data sources.",
  },
  DataSets: {
    id: "datasets",
    defaultMessage: "Datasets",
    description:
      "Label used for an individual dataset within a collection of data sources, akin to definition here https://en.wikipedia.org/wiki/Data_set",
  },
  Topics: {
    id: "topics",
    defaultMessage: "Topics",
    description:
      "A label used for topic categories that can be applied to a dataset. Example topics include Crime, Demographics, Economics, Education, Energy, Environment, Equity, Health, and Housing.",
  },
  License: {
    id: "license",
    defaultMessage: "License",
    description:
      "A label used to for the copyright license associated with a dataset. An example copyright license is Creative Commons 4 (https://creativecommons.org/licenses/by/4.0)",
  },
});
