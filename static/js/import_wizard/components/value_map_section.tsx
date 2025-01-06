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
 * Component for showing and updating the mapping of cell values.
 */

import _ from "lodash";
import Papa from "papaparse";
import React, { useEffect, useState } from "react";
import { Button, Input } from "reactstrap";

import { ValueMap } from "../types";
import { processValueMapFile } from "../utils/file_processing";

interface ValueMapSectionProps {
  valueMap: ValueMap;
  onValueMapSubmitted: (valueMap: ValueMap) => void;
  onValueMapUpdated: () => void;
}

interface ValueMapInput {
  originalVal: string;
  newVal: string;
}

const EMPTY_VALUE_MAP_INPUT = {
  originalVal: "",
  newVal: "",
};

export function ValueMapSection(props: ValueMapSectionProps): JSX.Element {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [mappingInput, setMappingInput] = useState(
    getMappingInput(props.valueMap)
  );
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showConfirmationButton, setShowConfirmationButton] = useState(true);
  const mappingInputOrderedList = Object.keys(mappingInput).sort(
    (a, b) => Number(a) - Number(b)
  );
  const [inputWarnings, setInputWarnings] = useState(new Set());
  const [fileSkippedRows, setFileSkippedRows] = useState([]);

  useEffect(() => {
    props.onValueMapUpdated();
    setShowConfirmationButton(true);
  }, [uploadedFile, mappingInput, showFileUpload]);

  return (
    <>
      <div className="section-container">
        <div className="section-header">
          <h2>Update File Values</h2>
          <div className="header-tab-section">
            {/*TODO: make this into a toggle switch like in scatter tool*/}
            <div
              className={`header-tab${showFileUpload ? "" : "-selected"}`}
              onClick={(): void => setShowFileUpload(false)}
            >
              Enter values to remap
            </div>
            <span>|</span>
            <div
              className={`header-tab${showFileUpload ? "-selected" : ""}`}
              onClick={(): void => setShowFileUpload(true)}
            >
              Upload file
            </div>
          </div>
        </div>
        {showFileUpload ? (
          <div className="value-map-file-container">
            File format accepted:
            <ul>
              <li>.txt file</li>
              <li>
                Each mapping of original CSV value to new CSV value should be on
                a new line and the values on each line should be separated by a
                comma.
                <ul>
                  <li>
                    <div className="value-map-file-example-container">
                      <span>Example:</span>
                      <span className="value-map-file-example">
                        <span>&quot;United States of America&quot;,USA</span>
                        <span>Canada,CAN</span>
                      </span>
                    </div>
                  </li>
                </ul>
              </li>
              <li>Original CSV value is case sensitive</li>
              <li>
                If the original CSV value is empty, the mapping will be skipped.
              </li>
            </ul>
            <input
              type="file"
              accept=".txt"
              onChange={(event): void => {
                if (event.target.files.length < 1) {
                  setUploadedFile(null);
                }
                setUploadedFile(event.target.files[0]);
              }}
            />
            {!_.isEmpty(fileSkippedRows) && (
              <div className="value-map-warning-message">
                The following lines were skipped because they did not match the
                expected format: {fileSkippedRows.join(", ")}
              </div>
            )}
          </div>
        ) : (
          <div className="value-map-input-container">
            <div className="value-map-input-header">
              <span>Orignal CSV Value</span>
              <span>New CSV Value</span>
            </div>
            {mappingInputOrderedList.map((id) => {
              return (
                <div key={id}>
                  <div className="value-map-input-entry">
                    <Input
                      className="value-map-input"
                      type="text"
                      onChange={(e): void =>
                        onMappingInputChanged(id, e.target.value, true)
                      }
                      value={mappingInput[id].originalVal}
                    />
                    <Input
                      className="value-map-input"
                      type="text"
                      onChange={(e): void =>
                        onMappingInputChanged(id, e.target.value, false)
                      }
                      value={mappingInput[id].newVal}
                    />
                    <i
                      className="material-icons-outlined"
                      onClick={(): void => {
                        setMappingInput((prev) => {
                          const newMappingInput = _.cloneDeep(prev);
                          delete newMappingInput[id];
                          return newMappingInput;
                        });
                      }}
                    >
                      cancel
                    </i>
                  </div>
                  {inputWarnings.has(id) && (
                    <span className="value-map-warning-message">
                      Skipped this remap because Original CSV Value can not be
                      empty.
                    </span>
                  )}
                </div>
              );
            })}
            <div
              className="value-map-add-entry"
              onClick={(): void => {
                const nextId = _.isEmpty(mappingInputOrderedList)
                  ? 0
                  : Number(
                      mappingInputOrderedList[
                        mappingInputOrderedList.length - 1
                      ]
                    ) + 1;
                setMappingInput((prev) => {
                  return { ...prev, [nextId]: EMPTY_VALUE_MAP_INPUT };
                });
              }}
            >
              <i className="material-icons-outlined">add_circle</i>
              Add entry
            </div>
          </div>
        )}
      </div>
      {showConfirmationButton && (
        <div className="confirmation-button">
          <Button onClick={onConfirmationClicked}>Next</Button>
        </div>
      )}
    </>
  );

  function onMappingInputChanged(
    inputId: string,
    newInputVal: string,
    isOriginalVal: boolean
  ): void {
    setMappingInput((prev) => {
      const newMappingInput = _.cloneDeep(prev);
      newMappingInput[inputId] = {
        originalVal: isOriginalVal ? newInputVal : prev[inputId].originalVal,
        newVal: isOriginalVal ? prev[inputId].newVal : newInputVal,
      };
      return newMappingInput;
    });
  }

  function onConfirmationClicked(): void {
    if (showFileUpload && !_.isNull(uploadedFile)) {
      const reader = new FileReader();
      reader.onload = (e): void => {
        const rows = Papa.parse(e.target.result as string).data;
        const { skippedRows, valueMap } = processValueMapFile(rows);
        props.onValueMapSubmitted(valueMap);
        setShowConfirmationButton(false);
        setFileSkippedRows(skippedRows);
      };
      reader.readAsText(uploadedFile);
    } else {
      const valueMap = {};
      const emptyOriginalVals = new Set();
      if (!showFileUpload) {
        Object.entries(mappingInput).forEach(([inputId, entity]) => {
          if (_.isEmpty(entity.originalVal)) {
            emptyOriginalVals.add(inputId);
          }
          valueMap[entity.originalVal] = entity.newVal;
        });
      }
      props.onValueMapSubmitted(valueMap);
      setShowConfirmationButton(false);
      setInputWarnings(emptyOriginalVals);
      setFileSkippedRows([]);
    }
  }
}

function getMappingInput(valueMap: ValueMap): { [id: number]: ValueMapInput } {
  if (_.isEmpty(valueMap)) {
    return { 0: EMPTY_VALUE_MAP_INPUT };
  }
  const mappingInput = {};
  let inputId = 0;
  Object.entries(valueMap).forEach(([originalVal, newVal]) => {
    mappingInput[inputId] = { originalVal, newVal };
    inputId++;
  });
  return mappingInput;
}
