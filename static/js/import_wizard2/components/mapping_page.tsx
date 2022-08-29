/**
 * Copyright 2022 Google LLC
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

/**
 * Component that is a container page for refining table format and downloading
 * the import package
 */

import React from "react";

import {
  TEMPLATE_MAPPING_SECTION_COMPONENTS,
  TEMPLATE_OPTIONS,
} from "../templates";
import { CsvData } from "../types";

interface MappingPageProps {
  csvData: CsvData;
  selectedTemplate: string;
  onChangeFile: () => void;
  onChangeTemplate: () => void;
}

export function MappingPage(props: MappingPageProps): JSX.Element {
  // TODO: call detection API to get predicted mappings
  // TODO: add preview section
  let fileName = "test.csv";
  if (props.csvData && props.csvData.rawCsvFile) {
    fileName = props.csvData.rawCsvFile.name;
  } else if (props.csvData && props.csvData.rawCsvUrl) {
    fileName = props.csvData.rawCsvUrl;
  }
  const MappingSectionComponent =
    TEMPLATE_MAPPING_SECTION_COMPONENTS[props.selectedTemplate];
  return (
    <>
      {/* TODO: update page heading to something more intuitive to users */}
      <h2>Step 3: Refine table format</h2>
      <div className="mapping-page-navigation-section">
        <div className="mapping-page-navigation-option">
          <span>File: {fileName}</span>
          <span
            onClick={props.onChangeFile}
            className="mapping-page-navigation-button"
          >
            Change file
          </span>
        </div>
        <div className="mapping-page-navigation-option">
          <span>
            Selected template:{" "}
            {TEMPLATE_OPTIONS[props.selectedTemplate].description}
          </span>
          <span
            onClick={props.onChangeFile}
            className="mapping-page-navigation-button"
          >
            Change template
          </span>
        </div>
      </div>
      <MappingSectionComponent />
    </>
  );
}
