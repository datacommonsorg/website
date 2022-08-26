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

import React, { useState } from "react";
import { Button } from "reactstrap";

import {
  TEMPLATE_MAPPING_SECTION_COMPONENTS,
  TEMPLATE_OPTIONS,
} from "../templates";
import { CsvData, Mapping, ValueMap } from "../types";
import { shouldGenerateCsv } from "../utils/file_generation";
import { MappingPreviewSection } from "./mapping_preview_section";

interface MappingPageProps {
  csvData: CsvData;
  selectedTemplate: string;
  onChangeFile: () => void;
  onChangeTemplate: () => void;
}

export function MappingPage(props: MappingPageProps): JSX.Element {
  // TODO: call detection API to get predicted mappings
  const [predictedMapping, setPredictedMapping] = useState<Mapping>(null);
  // TODO: get corrections and valueMap from MappingSectionComponent
  const [corrections, setCorrections] = useState<{
    mapping: Mapping;
    csv: CsvData;
  }>(null);
  const [valueMap, setValueMap] = useState<ValueMap>({});
  const [showPreview, setShowPreview] = useState(false);

  let fileName = "";
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
      <Button className="nav-btn" onClick={() => setShowPreview(true)}>
        Generate Preview
      </Button>
      {showPreview && (
        <MappingPreviewSection
          predictedMapping={predictedMapping}
          correctedMapping={corrections.mapping}
          csvData={corrections.csv}
          shouldGenerateCsv={shouldGenerateCsv(
            props.csvData,
            corrections.csv,
            valueMap
          )}
          valueMap={valueMap}
        />
      )}
    </>
  );
}
