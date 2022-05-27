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

import _ from "lodash";
import React, { useEffect, useState } from "react";
import { Button, Col, FormGroup, Input, Label, Row } from "reactstrap";

import { Chip } from "../../shared/chip";
import { PlaceSelector } from "../../shared/place_selector";
import { getStatVarInfo } from "../../shared/stat_var";
import { NamedTypedPlace } from "../../shared/types";
import { getNamedTypedPlace } from "../../utils/place_utils";
import { isValidDate } from "../../utils/string_utils";
import { StatVarInfo } from "../timeline/chart_region";
import { StatVarChooser } from "./stat_var_chooser";

const URL_PARAM_KEYS = {
  // Whether or not date range is selected
  DATE_RANGE: "dtRange",
  // The max date in date range
  MAX_DATE: "dtMax",
  // The min date in date range
  MIN_DATE: "dtMin",
  // The selected place
  PLACE: "place",
  // The type of place within the selected place to get data for
  PLACE_TYPE: "pt",
  // The statistical variables to get the data for
  STAT_VARS: "sv",
};

const SEPARATOR = "__";
const PARAM_VALUE_TRUE = "1";

interface DownloadOptions {
  selectedPlace: NamedTypedPlace;
  enclosedPlaceType: string;
  selectedStatVars: Record<string, StatVarInfo>;
  dateRange: boolean;
  minDate: string;
  maxDate: string;
}

interface ValidationErrors {
  minDate: boolean;
  maxDate: boolean;
  incompleteSelectionMessage: string;
}

export function Page(): JSX.Element {
  const [selectedOptions, setSelectedOptions] = useState<DownloadOptions>(null);
  const [previewDisabled, setPreviewDisabled] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    incompleteSelectionMessage: "",
    maxDate: false,
    minDate: false,
  });
  const [isSvModalOpen, updateSvModalOpen] = useState(false);
  const toggleSvModalCallback = () => updateSvModalOpen(!isSvModalOpen);

  useEffect(() => {
    if (showPreview) {
      setPreviewDisabled(true);
    }
  }, [selectedOptions]);

  useEffect(() => {
    getOptionsFromURL();
  }, []);

  if (!selectedOptions) {
    return <></>;
  }

  const getDataButtonText = showPreview ? "Update" : "Preview";
  const showInfo =
    _.isEmpty(validationErrors.incompleteSelectionMessage) && !showPreview;
  return (
    // TODO: Try to move the options into a separate component.
    <>
      <StatVarChooser
        statVars={selectedOptions.selectedStatVars}
        placeDcid={selectedOptions.selectedPlace.dcid}
        enclosedPlaceType={selectedOptions.enclosedPlaceType}
        onStatVarSelected={selectSV}
        onStatVarRemoved={removeSV}
        openSvHierarchyModal={isSvModalOpen}
        openSvHierarchyModalCallback={toggleSvModalCallback}
      />
      <div id="plot-container">
        <h1 className="mb-4">Download Tool</h1>
        <div className="download-options-container">
          <PlaceSelector
            selectedPlace={selectedOptions.selectedPlace}
            enclosedPlaceType={selectedOptions.enclosedPlaceType}
            onPlaceSelected={(place) =>
              setSelectedOptions((prev) => {
                return { ...prev, selectedPlace: place, enclosedPlaceType: "" };
              })
            }
            onEnclosedPlaceTypeSelected={(enclosedPlaceType) =>
              setSelectedOptions((prev) => {
                return { ...prev, enclosedPlaceType };
              })
            }
          >
            <div className="download-option-section">
              <div className="download-option-label">Date</div>
              <div className="download-date-options">
                <FormGroup radio="true">
                  <Label radio="true">
                    <Input
                      id="latest-date"
                      type="radio"
                      name="date"
                      defaultChecked={!selectedOptions.dateRange}
                      onClick={() =>
                        setSelectedOptions((prev) => {
                          return { ...prev, dateRange: false };
                        })
                      }
                    />
                    Latest Date
                  </Label>
                </FormGroup>
                <FormGroup radio="true" className="download-date-range-section">
                  <Label radio="true" className="download-date-range-container">
                    <Input
                      id="date-range"
                      type="radio"
                      name="date"
                      defaultChecked={selectedOptions.dateRange}
                      onClick={() =>
                        setSelectedOptions((prev) => {
                          return { ...prev, dateRange: true };
                        })
                      }
                    />
                    Date Range:
                  </Label>
                  <div className="download-date-range-input-section">
                    <div className="download-date-range-input-container">
                      <div>
                        <FormGroup>
                          <Input
                            className={`download-date-range-input${
                              validationErrors.minDate ? "-error" : ""
                            }`}
                            type="text"
                            onChange={(e) => {
                              const date = e.target.value;
                              setSelectedOptions((prev) => {
                                return { ...prev, minDate: date };
                              });
                            }}
                            disabled={!selectedOptions.dateRange}
                            value={selectedOptions.minDate}
                            onBlur={(e) => validateDate(e.target.value, true)}
                          />
                        </FormGroup>
                      </div>
                      <span>to</span>
                      <div>
                        <FormGroup>
                          <Input
                            className={`download-date-range-input${
                              validationErrors.maxDate ? "-error" : ""
                            }`}
                            type="text"
                            onChange={(e) => {
                              const date = e.target.value;
                              setSelectedOptions((prev) => {
                                return { ...prev, maxDate: date };
                              });
                            }}
                            disabled={!selectedOptions.dateRange}
                            value={selectedOptions.maxDate}
                            onBlur={(e) => validateDate(e.target.value, false)}
                          />
                        </FormGroup>
                      </div>
                    </div>
                    <div
                      className={`download-date-range-hint${
                        validationErrors.minDate || validationErrors.maxDate
                          ? "-error"
                          : ""
                      }`}
                    >
                      YYYY or YYYY-MM or YYYY-MM-DD
                    </div>
                  </div>
                </FormGroup>
              </div>
            </div>
            <div className="download-option-section">
              <div className="download-option-label">Variables</div>
              {_.isEmpty(selectedOptions.selectedStatVars) ? (
                "None selected"
              ) : (
                <div className="download-sv-chips">
                  {Object.keys(selectedOptions.selectedStatVars).map((sv) => {
                    return (
                      <Chip
                        key={sv}
                        id={sv}
                        title={selectedOptions.selectedStatVars[sv].title || sv}
                        removeChip={removeSV}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            <Row className="d-lg-none">
              <Col>
                <Button color="primary" onClick={toggleSvModalCallback}>
                  Select variable
                </Button>
              </Col>
            </Row>
            <Button onClick={onGetDataButtonClicked} color="primary">
              {getDataButtonText}
            </Button>
          </PlaceSelector>
        </div>
        {!_.isEmpty(validationErrors.incompleteSelectionMessage) && (
          <div>{validationErrors.incompleteSelectionMessage}</div>
        )}
        {showPreview && (
          <div>{previewDisabled ? "disabled preview" : "preview"}</div>
        )}
        {showInfo && <div>info text</div>}
      </div>
    </>
  );

  function selectSV(sv: string, svInfo: StatVarInfo): void {
    setSelectedOptions((prev) => {
      const updatedSV = _.cloneDeep(prev.selectedStatVars);
      updatedSV[sv] = svInfo;
      return { ...prev, selectedStatVars: updatedSV };
    });
  }

  function removeSV(sv: string): void {
    setSelectedOptions((prev) => {
      const updatedSV = _.cloneDeep(prev.selectedStatVars);
      if (sv in updatedSV) {
        delete updatedSV[sv];
      }
      return { ...prev, selectedStatVars: updatedSV };
    });
  }

  function getOptionsFromURL(): void {
    const options = {
      dateRange: false,
      enclosedPlaceType: "",
      maxDate: "",
      minDate: "",
      selectedPlace: { dcid: "", name: "", types: null },
      selectedStatVars: {},
    };
    if (!window.location.hash) {
      setSelectedOptions(options);
    }
    const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
    const place = urlParams.get(URL_PARAM_KEYS.PLACE);
    const placePromise = place
      ? getNamedTypedPlace(place)
      : Promise.resolve({ dcid: "", name: "", types: null });
    const statVarsParam = urlParams.get(URL_PARAM_KEYS.STAT_VARS);
    const statVarsList = statVarsParam ? statVarsParam.split(SEPARATOR) : [];
    const svInfoPromise = !_.isEmpty(statVarsList)
      ? getStatVarInfo(statVarsList)
      : Promise.resolve({});
    options.enclosedPlaceType = urlParams.get(URL_PARAM_KEYS.PLACE_TYPE) || "";
    options.dateRange =
      urlParams.get(URL_PARAM_KEYS.DATE_RANGE) === PARAM_VALUE_TRUE;
    options.minDate = urlParams.get(URL_PARAM_KEYS.MIN_DATE) || "";
    options.maxDate = urlParams.get(URL_PARAM_KEYS.MAX_DATE) || "";
    Promise.all([placePromise, svInfoPromise])
      .then(([place, svInfo]) => {
        setSelectedOptions({
          ...options,
          selectedPlace: place,
          selectedStatVars: svInfo,
        });
      })
      .catch(() => {
        const emptySvInfo = {};
        statVarsList.forEach((sv) => (emptySvInfo[sv] = {}));
        setSelectedOptions({
          ...options,
          selectedPlace: { dcid: place, name: place, types: [] },
          selectedStatVars: emptySvInfo,
        });
      });
  }

  function updateURL(): void {
    const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
    const urlParamVals = {
      [URL_PARAM_KEYS.PLACE_TYPE]: selectedOptions.enclosedPlaceType,
      [URL_PARAM_KEYS.PLACE]: selectedOptions.selectedPlace
        ? selectedOptions.selectedPlace.dcid
        : "",
      [URL_PARAM_KEYS.STAT_VARS]: Object.keys(
        selectedOptions.selectedStatVars
      ).join(SEPARATOR),
      [URL_PARAM_KEYS.DATE_RANGE]: selectedOptions.dateRange
        ? PARAM_VALUE_TRUE
        : "",
      [URL_PARAM_KEYS.MIN_DATE]: selectedOptions.minDate,
      [URL_PARAM_KEYS.MAX_DATE]: selectedOptions.maxDate,
    };
    for (const key of Object.keys(urlParamVals)) {
      const val = urlParamVals[key];
      if (_.isEmpty(val)) {
        urlParams.delete(key);
      } else {
        urlParams.set(key, val);
      }
    }
    window.location.hash = urlParams.toString();
  }

  function validateDate(date: string, isMinDate: boolean): void {
    const dateError = !_.isEmpty(date) && !isValidDate(date);
    setValidationErrors((prev) => {
      return {
        ...prev,
        maxDate: !isMinDate ? dateError : prev.maxDate,
        minDate: isMinDate ? dateError : prev.minDate,
      };
    });
  }

  function onGetDataButtonClicked(): void {
    let incompleteSelectionMessage = "";
    if (selectedOptions.dateRange) {
      if (
        (!_.isEmpty(selectedOptions.minDate) &&
          !isValidDate(selectedOptions.minDate)) ||
        (!_.isEmpty(selectedOptions.maxDate) &&
          !isValidDate(selectedOptions.maxDate))
      ) {
        incompleteSelectionMessage = "Invalid dates entered.";
      }
    }
    if (
      _.isEmpty(selectedOptions.selectedStatVars) ||
      _.isEmpty(selectedOptions.selectedPlace) ||
      _.isEmpty(selectedOptions.enclosedPlaceType)
    ) {
      incompleteSelectionMessage =
        "Please select a place, place type, and at least one variable.";
    }
    setValidationErrors((prev) => {
      return { ...prev, incompleteSelectionMessage };
    });
    if (!_.isEmpty(incompleteSelectionMessage)) {
      return;
    }
    setShowPreview(true);
    setPreviewDisabled(false);
    updateURL();
  }
}
