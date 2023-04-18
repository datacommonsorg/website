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

import _ from "lodash";
import React, { useState } from "react";
import { Button } from "reactstrap";

import { TEMPLATE_MAPPING_COMPONENTS } from "../templates";
import {
  Column,
  CsvData,
  MappedThing,
  Mapping,
  MappingVal,
  ValueMap,
} from "../types";
import { MappingPreviewSection } from "./mapping_preview_section";
import { PreviewTable } from "./preview_table";

interface MappingPageProps {
  csvData: CsvData;
  userMapping: Mapping;
  onUserMappingUpdated: (userMapping: Mapping) => void;
  selectedTemplate: string;
  onBackClicked: () => void;
  onContinueClicked: () => void;
}

export function MappingPage(props: MappingPageProps): JSX.Element {
  // TODO: get valueMap from MappingSectionComponent
  const [valueMap, setValueMap] = useState<ValueMap>({});
  const [showPreview, setShowPreview] = useState(false);

  let fileName = "";
  if (props.csvData && props.csvData.rawCsvFile) {
    fileName = props.csvData.rawCsvFile.name;
  } else if (props.csvData && props.csvData.rawCsvUrl) {
    fileName = props.csvData.rawCsvUrl;
  }

  // Function to run when mapping value is updated for a mapped thing.
  function onMappingValUpdated(
    mappedThing: MappedThing,
    mappingVal: MappingVal
  ): void {
    const newUserMapping = _.cloneDeep(props.userMapping);
    if (_.isEmpty(mappingVal)) {
      newUserMapping.delete(mappedThing);
    } else {
      newUserMapping.set(mappedThing, mappingVal);
    }
    props.onUserMappingUpdated(newUserMapping);
  }

  const MappingSectionComponent =
    TEMPLATE_MAPPING_COMPONENTS[props.selectedTemplate];
  const mappedColumnIndices = new Set();
  props.userMapping &&
    props.userMapping.forEach((mappingVal) => {
      if (mappingVal.column) {
        mappedColumnIndices.add(mappingVal.column.columnIdx);
      }
      if (mappingVal.headers) {
        mappingVal.headers.forEach((col) => {
          if (col) {
            mappedColumnIndices.add(col.columnIdx);
          }
        });
      }
    });
  const unmappedColumns = props.csvData.orderedColumns.filter(
    (col) => !mappedColumnIndices.has(col.columnIdx)
  );
  return (
    <>
      <h2>Label your file</h2>
      <div className="mapping-page-content">
        <div id="mapping-section" className="mapping-page-section">
          <div>
            Please add labels to help us map your dataset to the Data Commons
            database.
          </div>
          <div>*=required</div>
          {/* TODO: update page heading to something more intuitive to users */}
          <section>
            <MappingSectionComponent
              csvData={props.csvData}
              userMapping={props.userMapping}
              onMappingValUpdated={onMappingValUpdated}
            />
            <div className="mapping-input-section">
              <div>Ignored columns:</div>
              <div>
                {_.isEmpty(unmappedColumns)
                  ? "None"
                  : unmappedColumns.map((col: Column, idx) => {
                      return `${idx > 0 ? ", " : ""}${col.header}`;
                    })}
              </div>
            </div>
          </section>
          {showPreview ? (
            <section>
              {/* TODO: Each template should generate and return row observations. */}
              <MappingPreviewSection
                correctedMapping={props.userMapping}
                csvData={props.csvData}
                valueMap={valueMap}
                onBackClicked={props.onBackClicked}
                onContinueClicked={props.onContinueClicked}
              />
            </section>
          ) : (
            <div className="navigation-section">
              <Button className="nav-btn" onClick={props.onBackClicked}>
                Back
              </Button>
              <Button className="nav-btn" onClick={() => setShowPreview(true)}>
                Show Preview
              </Button>
            </div>
          )}
        </div>
        <div className="mapping-page-section">
          <PreviewTable csvData={props.csvData} />
        </div>
      </div>
    </>
  );
}
