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

export const metadataComponentMessages = defineMessages({
  NoMetadataAvailable: {
    id: "noMetadataAvailable",
    defaultMessage: "No metadata available.",
    description:
      "Message shown when no metadata is available for a statistical variable.",
  },
  DCID: {
    id: "dcid",
    defaultMessage: "DCID",
    description:
      "Label for Data Commons ID (DCID), a unique identifier in the Data Commons knowledge graph.",
  },
  Topic: {
    id: "topic",
    defaultMessage: "Topic",
    description:
      "A label used for topic categories that can be applied to a dataset. Example topics include " +
      "Crime, Demographics, Economics, Education, Energy, Environment, Equity, Health, and Housing.",
  },
  MetadataDateRange: {
    id: "metadataDateRange",
    defaultMessage: "Date range",
    description:
      "Label for date range information in metadata. Example date range is: 1960-2022.",
  },
  Unit: {
    id: "unit",
    defaultMessage: "Unit",
    description:
      "Label for the unit that describes the data. Example units are: Years, Gallons Per Year.",
  },
  PublicationCadence: {
    id: "publicationCadence",
    defaultMessage: "Publication cadence",
    description:
      "Label for the cadence of publication. This is the rate of publication of the data. " +
      "Examples are: Yearly, Monthly.",
  },
  ObservationPeriod: {
    id: "observationPeriod",
    defaultMessage: "Observation period",
    description:
      "The time period over which an observation is made." +
      "Examples are: Yearly, Monthly. " +
      "See: https://docs.datacommons.org/glossary.html#observation-period.",
  },
  ScalingFactor: {
    id: "scalingFactor",
    defaultMessage: "Scaling factor",
    description:
      "In conjunction with the measurement denominator, scaling factor indicates the multiplication " +
      "factor applied to the value. " +
      "See: https://docs.datacommons.org/glossary.html#scaling-factor.",
  },
  License: {
    id: "license",
    defaultMessage: "License",
    description:
      "A label used for the copyright license associated with a dataset. An example copyright " +
      "license is Creative Commons 4 (https://creativecommons.org/licenses/by/4.0).",
  },
  MeasuringMethod: {
    id: "measuringMethod",
    defaultMessage: "Measuring method",
    description:
      "Label for the methodology used to produce the data. Examples are: ACS 5-Year Survey, " +
      "OECD Regional Statistics.",
  },
  SourceAndCitation: {
    id: "sourceAndCitation",
    defaultMessage: "Source and citation",
    description: "Title for source and citation section in the metadata modal.",
  },
  DataSources: {
    id: "dataSources",
    defaultMessage: "Data sources",
    description:
      "Label preceding the list of data sources in the metadata modal.",
  },
  MinorProcessing: {
    id: "minorProcessing",
    defaultMessage: "with minor processing by Data Commons",
    description:
      "Text indicating data was processed by Data Commons. This will appear in the citation " +
      "section of the metadata modal after the list of sources.",
  },
  CitationGuidance: {
    id: "citationGuidance",
    defaultMessage: "Citation guidance",
    description:
      "Label preceding guidance on how to cite the data sources in the metadata modal.",
  },
  PleaseCredit: {
    id: "pleaseCredit",
    defaultMessage:
      "Please credit all sources listed above. Data provided by third-party sources through Data Commons remains " +
      "subject to the original provider's license terms.",
    description:
      "Text providing guidance on citing data sources in academic work, publications, or other derivative uses.",
  },
  CopyCitation: {
    id: "copyCitation",
    defaultMessage: "Copy citation",
    description:
      "Label for the button that copies the citation to the clipboard when clicked. " +
      "The copied text will contain one or more sources. Citation is akin to the " +
      "definition here https://en.wikipedia.org/wiki/Citation.",
  },
});
