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
import React, { useEffect, useState } from "react";
import { Button } from "reactstrap";

import {
  TEMPLATE_MAPPING_COMPONENTS,
  TEMPLATE_OPTIONS,
  TEMPLATE_PREDICTION_VALIDATION,
} from "../templates";
import { CsvData, MappedThing, Mapping, MappingVal, ValueMap } from "../types";
import { shouldGenerateCsv } from "../utils/file_generation";
import { checkMappings } from "../utils/validation";
import { MappingPreviewSection } from "./mapping_preview_section";
import { PreviewTable } from "./preview_table";

interface MappingPageProps {
  csvData: CsvData;
  selectedTemplate: string;
  onChangeFile: () => void;
  onChangeTemplate: () => void;
}

export function MappingPage(props: MappingPageProps): JSX.Element {
  // TODO: call detection API to get predicted mappings
  const [predictedMapping, setPredictedMapping] = useState<Mapping>(new Map());
  const [userMapping, setUserMapping] = useState<Mapping>(new Map());
  // TODO: get valueMap from MappingSectionComponent
  const [valueMap, setValueMap] = useState<ValueMap>({});
  const [showPreview, setShowPreview] = useState(false);
  const [errorList, setErrorList] = useState<Array<string>>([]);

  let fileName = "";
  if (props.csvData && props.csvData.rawCsvFile) {
    fileName = props.csvData.rawCsvFile.name;
  } else if (props.csvData && props.csvData.rawCsvUrl) {
    fileName = props.csvData.rawCsvUrl;
  }

  useEffect(() => {
    // TODO: Use actual prediction from server-side detection API.
    const predictedMapping = new Map();
    setPredictedMapping(predictedMapping);
    const userMappingFn =
      TEMPLATE_PREDICTION_VALIDATION[props.selectedTemplate];
    setUserMapping(userMappingFn(predictedMapping));
  }, [props.csvData, props.selectedTemplate]);

  // Function to run when mapping value is updated for a mapped thing.
  function onMappingValUpdated(
    mappedThing: MappedThing,
    mappingVal: MappingVal
  ): void {
    const newUserMapping = _.clone(userMapping);
    if (_.isEmpty(mappingVal)) {
      newUserMapping.delete(mappedThing);
    } else {
      newUserMapping.set(mappedThing, mappingVal);
    }
    setUserMapping(newUserMapping);
    setShowPreview(false);
  }

  const MappingSectionComponent =
    TEMPLATE_MAPPING_COMPONENTS[props.selectedTemplate];
  return (
    <div id="mapping-section">
      {/* TODO: update page heading to something more intuitive to users */}
      <h2>Step 3: Refine table format</h2>
      <section>
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
              {`${TEMPLATE_OPTIONS[props.selectedTemplate].title} (${
                TEMPLATE_OPTIONS[props.selectedTemplate].subtitle
              })`}
            </span>
            <span
              onClick={props.onChangeTemplate}
              className="mapping-page-navigation-button"
            >
              Change template
            </span>
          </div>
        </div>
      </section>
      <section>
        <PreviewTable csvData={props.csvData} />
      </section>
      <section>
        <MappingSectionComponent
          csvData={props.csvData}
          userMapping={userMapping}
          onMappingValUpdated={onMappingValUpdated}
        />
      </section>
      <section>
        {/* TODO: Disable button if template mapping is incomplete */}
        <Button
          className="nav-btn"
          onClick={() => {
            const mappingErrors = checkMappings(userMapping);
            setErrorList(mappingErrors);
            if (_.isEmpty(mappingErrors)) {
              setShowPreview(true);
            }
          }}
        >
          Generate Preview
        </Button>
      </section>
      {!_.isEmpty(errorList) && (
        <div className="mapping-errors section-container">
          <span>
            There are errors in the mapping, please fix them before continuing.
          </span>
          <ul>
            {errorList.map((error, idx) => {
              return <li key={`error-${idx}`}>{error}</li>;
            })}
          </ul>
        </div>
      )}
      {showPreview && (
        <section>
          {/* TODO: Each template should generate and return row observations. */}
          <MappingPreviewSection
            predictedMapping={predictedMapping}
            correctedMapping={userMapping}
            csvData={props.csvData}
            shouldGenerateCsv={shouldGenerateCsv(
              props.csvData,
              props.csvData /* TODO: Update to a smaller data structure of updates */,
              valueMap
            )}
            valueMap={valueMap}
          />
        </section>
      )}
    </div>
  );
}
