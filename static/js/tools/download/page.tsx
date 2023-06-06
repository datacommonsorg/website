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

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { Button, Col, FormGroup, Input, Label, Row } from "reactstrap";

import { Chip } from "../../shared/chip";
import { FacetSelector } from "../../shared/facet_selector";
import { PlaceSelector } from "../../shared/place_selector";
import { getStatVarInfo } from "../../shared/stat_var";
import { NamedTypedPlace } from "../../shared/types";
import { stringifyFn } from "../../utils/axios";
import { getNamedTypedPlace } from "../../utils/place_utils";
import { isValidDate } from "../../utils/string_utils";
import { StatVarInfo } from "../timeline/chart_region";
import { Info, InfoPlace } from "./info";
import { Preview } from "./preview";
import { StatVarChooser } from "./stat_var_chooser";

export const DownloadDateTypes = {
  ALL: "ALL",
  LATEST: "LATEST",
  RANGE: "RANGE",
};
export const DATE_LATEST = "latest";
export const DATE_ALL = "";

const URL_PARAM_KEYS = {
  // Whether or not date range is selected
  DATE_TYPE: "dtType",
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
  // The map of statistical variables to the chosen facet for that variable
  FACET_MAP: "facets",
};
const SEPARATOR = "__";

export interface DownloadOptions {
  selectedPlace: NamedTypedPlace;
  enclosedPlaceType: string;
  selectedStatVars: Record<string, StatVarInfo>;
  selectedFacets: Record<string, string>;
  dateType: string;
  minDate: string;
  maxDate: string;
}

interface ValidationErrors {
  minDate: boolean;
  maxDate: boolean;
  incompleteSelectionMessage: string;
}

interface PagePropType {
  // Example places to use in the info page
  infoPlaces: [InfoPlace, InfoPlace];
}

export function Page(props: PagePropType): JSX.Element {
  const [selectedOptions, setSelectedOptions] = useState<DownloadOptions>(null);
  const [previewOptions, setPreviewOptions] = useState<DownloadOptions>(null);
  const [previewDisabled, setPreviewDisabled] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] =
    useState<ValidationErrors>(null);
  const [facetListPromise, setFacetListPromise] = useState(Promise.resolve([]));
  // request object used to get facetListPromise
  const facetsReqObj = useRef({});
  const [isSvModalOpen, updateSvModalOpen] = useState(false);
  const toggleSvModalCallback = () => updateSvModalOpen(!isSvModalOpen);

  useEffect(() => {
    if (showPreview) {
      setPreviewDisabled(true);
    }
  }, [selectedOptions]);

  useEffect(() => {
    loadStateFromURL();
  }, []);

  useEffect(() => {
    if (shouldHideSourceSelector()) {
      return;
    }
    let minDate = selectedOptions.minDate;
    let maxDate = selectedOptions.maxDate;
    if (selectedOptions.dateType === DownloadDateTypes.ALL) {
      minDate = DATE_ALL;
      maxDate = DATE_ALL;
    } else if (selectedOptions.dateType === DownloadDateTypes.LATEST) {
      minDate = DATE_LATEST;
      maxDate = DATE_LATEST;
    } else {
      if (!isValidDateInput(minDate) || !isValidDateInput(maxDate)) {
        return;
      }
    }
    const reqObj = {
      statVars: Object.keys(selectedOptions.selectedStatVars),
      parentPlace: selectedOptions.selectedPlace.dcid,
      childType: selectedOptions.enclosedPlaceType,
      minDate,
      maxDate,
    };
    // if req object is the same as the one used for current
    // svSourceListPromise, then don't need to update svSourceListPromise
    if (_.isEqual(reqObj, facetsReqObj)) {
      return;
    }
    facetsReqObj.current = reqObj;
    setFacetListPromise(
      axios
        .get("/api/facets/within", {
          params: reqObj,
          paramsSerializer: stringifyFn,
        })
        .then((resp) => {
          const facetMap = resp.data;
          const sourceSelectorFacetList = [];
          for (const sv in selectedOptions.selectedStatVars) {
            sourceSelectorFacetList.push({
              dcid: sv,
              name: selectedOptions.selectedStatVars[sv].title || sv,
              metadataMap: sv in facetMap ? facetMap[sv] : {},
            });
          }
          return sourceSelectorFacetList;
        })
    );
  }, [selectedOptions]);

  if (!selectedOptions || !validationErrors) {
    return <></>;
  }

  const getDataButtonText = showPreview ? "Update Preview" : "Preview";
  const showInfo =
    _.isEmpty(validationErrors.incompleteSelectionMessage) && !showPreview;
  return (
    // TODO: Try to move the options into a separate component.
    <>
      <StatVarChooser
        statVars={selectedOptions.selectedStatVars}
        placeDcid={selectedOptions.selectedPlace.dcid}
        enclosedPlaceType={selectedOptions.enclosedPlaceType}
        onStatVarSelected={selectStatVar}
        onStatVarRemoved={removeStatVar}
        openSvHierarchyModal={isSvModalOpen}
        openSvHierarchyModalCallback={toggleSvModalCallback}
      />
      <div id="plot-container">
        <h1 className="mb-4">Data Download Tool</h1>
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
            customPlaceSearchLabel="Places in"
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
                      defaultChecked={
                        selectedOptions.dateType === DownloadDateTypes.LATEST
                      }
                      onClick={() =>
                        setSelectedOptions((prev) => {
                          return {
                            ...prev,
                            dateType: DownloadDateTypes.LATEST,
                          };
                        })
                      }
                    />
                    Latest Date
                  </Label>
                </FormGroup>
                <FormGroup radio="true">
                  <Label radio="true">
                    <Input
                      id="all-dates"
                      type="radio"
                      name="date"
                      defaultChecked={
                        selectedOptions.dateType === DownloadDateTypes.ALL
                      }
                      onClick={() =>
                        setSelectedOptions((prev) => {
                          return { ...prev, dateType: DownloadDateTypes.ALL };
                        })
                      }
                    />
                    All Available Dates
                  </Label>
                </FormGroup>
                <FormGroup radio="true" className="download-date-range-section">
                  <Label radio="true" className="download-date-range-container">
                    <Input
                      id="date-range"
                      type="radio"
                      name="date"
                      defaultChecked={
                        selectedOptions.dateType === DownloadDateTypes.RANGE
                      }
                      onClick={() =>
                        setSelectedOptions((prev) => {
                          return { ...prev, dateType: DownloadDateTypes.RANGE };
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
                              selectedOptions.dateType ===
                                DownloadDateTypes.RANGE &&
                              validationErrors.minDate
                                ? "-error"
                                : ""
                            }`}
                            type="text"
                            onChange={(e) => {
                              const date = e.target.value;
                              setSelectedOptions((prev) => {
                                return { ...prev, minDate: date };
                              });
                            }}
                            disabled={
                              selectedOptions.dateType !==
                              DownloadDateTypes.RANGE
                            }
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
                              selectedOptions.dateType ===
                                DownloadDateTypes.RANGE &&
                              validationErrors.maxDate
                                ? "-error"
                                : ""
                            }`}
                            type="text"
                            onChange={(e) => {
                              const date = e.target.value;
                              setSelectedOptions((prev) => {
                                return { ...prev, maxDate: date };
                              });
                            }}
                            disabled={
                              selectedOptions.dateType !==
                              DownloadDateTypes.RANGE
                            }
                            value={selectedOptions.maxDate}
                            onBlur={(e) => validateDate(e.target.value, false)}
                          />
                        </FormGroup>
                      </div>
                    </div>
                    <div
                      className={`download-date-range-hint${
                        selectedOptions.dateType === DownloadDateTypes.RANGE &&
                        (validationErrors.minDate || validationErrors.maxDate)
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
                "Please select variables"
              ) : (
                <div className="download-sv-chips">
                  {Object.keys(selectedOptions.selectedStatVars).map((sv) => {
                    return (
                      <Chip
                        key={sv}
                        id={sv}
                        title={selectedOptions.selectedStatVars[sv].title || sv}
                        removeChip={removeStatVar}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            {!shouldHideSourceSelector() && (
              <div className="download-option-section">
                <FacetSelector
                  svFacetId={selectedOptions.selectedFacets}
                  facetListPromise={facetListPromise}
                  onSvFacetIdUpdated={(svFacetId) => {
                    setSelectedOptions((prev) => {
                      return { ...prev, selectedFacets: svFacetId };
                    });
                  }}
                />
              </div>
            )}
            <Row className="d-lg-none">
              <Col>
                <Button color="primary" onClick={toggleSvModalCallback}>
                  Select variable
                </Button>
              </Col>
            </Row>
            <Button
              className="get-data-button"
              onClick={onGetDataButtonClicked}
              color="primary"
            >
              {getDataButtonText}
            </Button>
          </PlaceSelector>
          {!_.isEmpty(validationErrors.incompleteSelectionMessage) && (
            <div className="download-options-error-message">
              {validationErrors.incompleteSelectionMessage}
            </div>
          )}
        </div>
        {showPreview && (
          <Preview
            selectedOptions={previewOptions}
            isDisabled={previewDisabled}
          />
        )}
        {showInfo && <Info infoPlaces={props.infoPlaces} />}
      </div>
    </>
  );

  function selectStatVar(dcid: string, info: StatVarInfo): void {
    setSelectedOptions((prev) => {
      const updatedStatVar = _.cloneDeep(prev.selectedStatVars);
      updatedStatVar[dcid] = info;
      const updatedFacets = _.cloneDeep(prev.selectedFacets);
      updatedFacets[dcid] = "";
      return {
        ...prev,
        selectedStatVars: updatedStatVar,
        selectedFacets: updatedFacets,
      };
    });
  }

  function removeStatVar(dcid: string): void {
    setSelectedOptions((prev) => {
      const updatedStatVars = _.cloneDeep(prev.selectedStatVars);
      if (dcid in updatedStatVars) {
        delete updatedStatVars[dcid];
      }
      const updatedFacets = _.cloneDeep(prev.selectedFacets);
      if (dcid in updatedFacets) {
        delete updatedFacets[dcid];
      }
      return {
        ...prev,
        selectedStatVars: updatedStatVars,
        selectedFacets: updatedFacets,
      };
    });
  }

  function shouldHideSourceSelector(): boolean {
    return (
      !selectedOptions ||
      _.isEmpty(selectedOptions.selectedStatVars) ||
      _.isEmpty(selectedOptions.selectedPlace) ||
      _.isEmpty(selectedOptions.enclosedPlaceType)
    );
  }

  function loadStateFromURL(): void {
    const options = {
      dateType: DownloadDateTypes.LATEST,
      enclosedPlaceType: "",
      maxDate: "",
      minDate: "",
      selectedPlace: { dcid: "", name: "", types: null },
      selectedStatVars: {},
      selectedFacets: {},
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
    const svFacetsVal =
      JSON.parse(urlParams.get(URL_PARAM_KEYS.FACET_MAP)) || {};
    for (const sv of statVarsList) {
      options.selectedFacets[sv] = sv in svFacetsVal ? svFacetsVal[sv] : "";
    }
    options.enclosedPlaceType = urlParams.get(URL_PARAM_KEYS.PLACE_TYPE) || "";
    options.dateType =
      urlParams.get(URL_PARAM_KEYS.DATE_TYPE) || DownloadDateTypes.LATEST;
    options.minDate = urlParams.get(URL_PARAM_KEYS.MIN_DATE) || "";
    options.maxDate = urlParams.get(URL_PARAM_KEYS.MAX_DATE) || "";
    setValidationErrors({
      incompleteSelectionMessage: "",
      maxDate: !_.isEmpty(options.maxDate) && !isValidDate(options.maxDate),
      minDate: !_.isEmpty(options.minDate) && !isValidDate(options.minDate),
    });
    Promise.all([placePromise, svInfoPromise])
      .then(([place, svInfo]) => {
        options.selectedPlace = place;
        options.selectedStatVars = svInfo;
        setSelectedOptions(options);
        setPreviewOptions(options);
      })
      .catch(() => {
        const emptySvInfo = {};
        statVarsList.forEach((sv) => (emptySvInfo[sv] = {}));
        options.selectedPlace = { dcid: place, name: place, types: [] };
        options.selectedStatVars = emptySvInfo;
        setSelectedOptions(options);
        setPreviewOptions(options);
      });
  }

  function updateURL(): void {
    const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
    const svFacetsParamVal = {};
    for (const sv in selectedOptions.selectedFacets) {
      if (selectedOptions.selectedFacets[sv]) {
        svFacetsParamVal[sv] = selectedOptions.selectedFacets[sv];
      }
    }
    const urlParamVals = {
      [URL_PARAM_KEYS.PLACE_TYPE]: selectedOptions.enclosedPlaceType,
      [URL_PARAM_KEYS.PLACE]: selectedOptions.selectedPlace
        ? selectedOptions.selectedPlace.dcid
        : "",
      [URL_PARAM_KEYS.STAT_VARS]: Object.keys(
        selectedOptions.selectedStatVars
      ).join(SEPARATOR),
      [URL_PARAM_KEYS.DATE_TYPE]: selectedOptions.dateType,
      [URL_PARAM_KEYS.MIN_DATE]: selectedOptions.minDate,
      [URL_PARAM_KEYS.MAX_DATE]: selectedOptions.maxDate,
      [URL_PARAM_KEYS.FACET_MAP]: JSON.stringify(svFacetsParamVal),
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

  function isValidDateInput(date: string): boolean {
    return _.isEmpty(date) || isValidDate(date);
  }

  function validateDate(date: string, isMinDate: boolean): void {
    const dateError = !isValidDateInput(date);
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
    if (selectedOptions.dateType === DownloadDateTypes.RANGE) {
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
    updateURL();
    setPreviewOptions(selectedOptions);
    setShowPreview(true);
    setPreviewDisabled(false);
  }
}
