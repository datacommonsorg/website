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
 * Component for previewing the results of the mapping
 */

import _ from "lodash";
import React, { useEffect, useState } from "react";
import { Button } from "reactstrap";

import { ValueMap } from "../../import_wizard/types";
import { CsvData, Mapping } from "../types";
import {
  generateRowObservations,
  observationToString,
} from "../utils/obs_generation";
import { checkMappings } from "../utils/validation";

interface MappingPreviewSectionProps {
  correctedMapping: Mapping;
  csvData: CsvData;
  valueMap: ValueMap;
  onBackClicked: () => void;
  onContinueClicked: () => void;
}

const MAX_ROW_SAMPLES = 3;

export function MappingPreviewSection(
  props: MappingPreviewSectionProps
): JSX.Element {
  const [sampleObs, setSampleObs] = useState(
    generateRowObservations(
      props.correctedMapping,
      props.csvData,
      props.valueMap
    )
  );
  const [errorList, setErrorList] = useState(
    checkMappings(props.correctedMapping)
  );

  useEffect(() => {
    setSampleObs(
      generateRowObservations(
        props.correctedMapping,
        props.csvData,
        props.valueMap
      )
    );
  }, [props.correctedMapping, props.csvData, props.valueMap]);

  useEffect(() => {
    setErrorList(checkMappings(props.correctedMapping));
  }, [props.correctedMapping]);

  return (
    <>
      <div>
        <h3>Example Observations</h3>
      </div>
      {!_.isEmpty(errorList) ? (
        <div className="mapping-errors">
          <span>
            There are errors in the mapping, please fix them before continuing.
          </span>
          <ul>
            {errorList.map((error, idx) => {
              return <li key={`error-${idx}`}>{error}</li>;
            })}
          </ul>
        </div>
      ) : (
        <div>
          <div>Please check statements below for accuracy</div>
          <div>
            {Array.from(sampleObs.keys()).map((row) => {
              const rowObs = sampleObs.get(row).slice(0, MAX_ROW_SAMPLES);
              return (
                <div key={`sample-obs-${row}`}>
                  Row {row.toString()}
                  <ul>
                    {rowObs.map((obs, idx) => {
                      const obsString = observationToString(obs);
                      return <li key={`row-${row}-obs-${idx}`}>{obsString}</li>;
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="navigation-section">
        <Button className="nav-btn" onClick={props.onBackClicked}>
          Back
        </Button>
        <Button
          className="nav-btn"
          onClick={!_.isEmpty(errorList) ? null : props.onContinueClicked}
        >
          Continue
        </Button>
      </div>
    </>
  );
}
