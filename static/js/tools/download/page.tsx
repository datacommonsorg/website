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

import { ThemeProvider } from "@emotion/react";
import axios from "axios";
import _ from "lodash";
import React, {
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Button, Col, Row } from "reactstrap";

import { FormBox } from "../../components/form_components/form_box";
import { intl } from "../../i18n/i18n";
import { toolMessages } from "../../i18n/i18n_tool_messages";
import { Chip } from "../../shared/chip";
import {
  WEBSITE_SURFACE,
  WEBSITE_SURFACE_HEADER,
} from "../../shared/constants";
import {
  FacetSelector,
  FacetSelectorFacetInfo,
} from "../../shared/facet_selector/facet_selector";
import { useFacetEnrichment } from "../../shared/hooks/use_facet_enrichment";
import { PointAllApiResponse } from "../../shared/stat_types";
import { getStatVarInfo, StatVarInfo } from "../../shared/stat_var";
import theme from "../../theme/theme";
import { enrichFacetChoices } from "../../tools/shared/facet_choice_fetcher";
import { stringifyFn } from "../../utils/axios";
import { getDataCommonsClient } from "../../utils/data_commons_client";
import { FacetResponse } from "../../utils/data_fetch_utils";
import { getNamedTypedPlace } from "../../utils/place_utils";
import { EnclosedPlacesSelector } from "../shared/place_selector/enclosed_places_selector";
import { ChartLinkChips } from "../shared/vis_tools/chart_link_chips";
import { VisToolInstructionsBox } from "../shared/vis_tools/vis_tool_instructions_box";
import {
  Context,
  ContextType,
  DownloadOptions,
  SEPARATOR,
  URL_PARAM_KEYS,
  useInitialContext,
} from "./context";
import { Preview } from "./preview";
import { StatVarChooser } from "./stat_var_chooser";

function App(): ReactElement {
  const [isSvModalOpen, updateSvModalOpen] = useState(false);
  const toggleSvModalCallback = (): void => updateSvModalOpen(!isSvModalOpen);
  const { options, preview, validation, facets } = useContext(Context);
  const dataCommonsClient = getDataCommonsClient(null, WEBSITE_SURFACE);
  const visToolExamples = globalThis.visToolExamples || [];

  useEffect(() => {
    if (preview.show) {
      preview.setDisabled(true);
    }
  }, [options.value]);

  useEffect(() => {
    if (shouldHideSourceSelector(options.value)) {
      facets.setList(null);
      facets.reqObj.current = {};
      return;
    }
    const reqObj = {
      childType: options.value.enclosedPlaceType,
      date: "",
      parentEntity: options.value.selectedPlace.dcid,
      variables: Object.keys(options.value.selectedStatVars),
    };
    if (_.isEqual(reqObj, facets.reqObj.current)) {
      return;
    }
    facets.reqObj.current = reqObj;
    facets.setLoading(true);
    facets.setError(false);
    facets.setList(null);
    axios
      .get("/api/facets/within", {
        params: reqObj,
        paramsSerializer: stringifyFn,
        headers: WEBSITE_SURFACE_HEADER,
      })
      .then(async (resp) => {
        const baseFacetData: PointAllApiResponse = resp.data;
        const baseFacets: FacetResponse = {};
        for (const sv in options.value.selectedStatVars) {
          if (baseFacetData.data[sv] && baseFacetData.data[sv][""]) {
            baseFacets[sv] = {};
            for (const item of baseFacetData.data[sv][""]) {
              if (baseFacetData.facets[item.facet]) {
                baseFacets[sv][item.facet] = baseFacetData.facets[item.facet];
              }
            }
          }
        }

        const sourceSelectorFacetList: FacetSelectorFacetInfo[] = [];
        for (const sv in baseFacets) {
          if (options.value.selectedStatVars[sv]) {
            sourceSelectorFacetList.push({
              dcid: sv,
              metadataMap: baseFacets[sv],
              name: options.value.selectedStatVars[sv].title || sv,
            });
          }
        }
        facets.setList(sourceSelectorFacetList);
      })
      .catch(() => {
        facets.setError(true);
      })
      .finally(() => {
        facets.setLoading(false);
      });
  }, [options.value, dataCommonsClient]);

  const facetListCacheKey = options.value
    ? `${options.value.selectedPlace.dcid}-${options.value.enclosedPlaceType}`
    : "";
  const {
    facetList: enrichedFacetList,
    loading: enrichmentLoading,
    onModalOpen,
    totalFacetCount,
  } = useFacetEnrichment(
    facetListCacheKey,
    facets.list,
    useCallback(async () => {
      if (!facets.list) return [];
      return enrichFacetChoices(facets.list, {
        parentPlace: options.value.selectedPlace.dcid,
        enclosedPlaceType: options.value.enclosedPlaceType,
      });
    }, [facets.list, options.value])
  );

  const selectedOptions = options.value;
  const validationErrors = validation.value;

  if (!selectedOptions || !validationErrors) {
    return <></>;
  }

  const getDataButtonText = preview.show ? "Update Preview" : "Preview";
  const showInfo =
    _.isEmpty(validationErrors.incompleteSelectionMessage) && !preview.show;
  return (
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
          <FormBox>
            <EnclosedPlacesSelector
              enclosedPlaceType={selectedOptions.enclosedPlaceType}
              onEnclosedPlaceTypeSelected={(enclosedPlaceType): void =>
                options.set((prev) => {
                  return { ...prev, enclosedPlaceType };
                })
              }
              onPlaceSelected={(place): void =>
                options.set((prev) => {
                  return {
                    ...prev,
                    selectedPlace: place,
                    enclosedPlaceType: "",
                  };
                })
              }
              searchBarInstructionText={intl.formatMessage(
                toolMessages.placeSearchBoxLabel
              )}
              selectedParentPlace={selectedOptions.selectedPlace}
            />
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
            {!shouldHideSourceSelector(selectedOptions) && (
              <div className="download-option-section">
                <FacetSelector
                  mode="download"
                  svFacetId={selectedOptions.selectedFacets}
                  facetList={enrichedFacetList}
                  totalFacetCount={totalFacetCount}
                  loading={facets.loading || enrichmentLoading}
                  error={facets.error}
                  onSvFacetIdUpdated={(svFacetId): void => {
                    options.set((prev) => {
                      return { ...prev, selectedFacets: svFacetId };
                    });
                  }}
                  onModalOpen={onModalOpen}
                />
              </div>
            )}
            <Row className="d-lg-none">
              <Col>
                <Button color="primary" onClick={toggleSvModalCallback}>
                  {intl.formatMessage(toolMessages.selectAVariableInstruction)}
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
          </FormBox>
          {!_.isEmpty(validationErrors.incompleteSelectionMessage) && (
            <div className="download-options-error-message">
              {validationErrors.incompleteSelectionMessage}
            </div>
          )}
        </div>
        {preview.show && (
          <Preview
            selectedOptions={preview.options}
            isDisabled={preview.disabled}
          />
        )}
        {showInfo && (
          <>
            <VisToolInstructionsBox toolType="download" />
            <ChartLinkChips
              toolType="download"
              visToolExamples={visToolExamples}
            />
          </>
        )}
      </div>
    </>
  );

  function selectStatVar(dcid: string, info: StatVarInfo): void {
    options.set((prev) => {
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
    options.set((prev) => {
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

  function onGetDataButtonClicked(): void {
    let incompleteSelectionMessage = "";
    if (
      _.isEmpty(selectedOptions.selectedStatVars) ||
      _.isEmpty(selectedOptions.selectedPlace) ||
      _.isEmpty(selectedOptions.enclosedPlaceType)
    ) {
      incompleteSelectionMessage =
        "Please select a place, place type, and at least one variable.";
    }
    validation.set((prev) => {
      return { ...prev, incompleteSelectionMessage };
    });
    if (!_.isEmpty(incompleteSelectionMessage)) {
      return;
    }
    updateURL(selectedOptions);
    preview.setOptions(selectedOptions);
    preview.setShow(true);
    preview.setDisabled(false);
  }
}

export function Page(): ReactElement {
  const store = useInitialContext();

  useEffect(() => {
    loadStateFromURL(store);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Context.Provider value={store}>
        <App />
      </Context.Provider>
    </ThemeProvider>
  );
}

function loadStateFromURL(context: ContextType): void {
  const opts: DownloadOptions = {
    enclosedPlaceType: "",
    selectedPlace: { dcid: "", name: "", types: null },
    selectedStatVars: {},
    selectedFacets: {},
  };
  if (!window.location.hash) {
    context.options.set(opts);
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
  const svFacetsVal = JSON.parse(urlParams.get(URL_PARAM_KEYS.FACET_MAP)) || {};
  for (const sv of statVarsList) {
    opts.selectedFacets[sv] = sv in svFacetsVal ? svFacetsVal[sv] : "";
  }
  opts.enclosedPlaceType = urlParams.get(URL_PARAM_KEYS.PLACE_TYPE) || "";
  context.validation.set({
    incompleteSelectionMessage: "",
  });
  Promise.all([placePromise, svInfoPromise])
    .then(([resolvedPlace, svInfo]) => {
      opts.selectedPlace = resolvedPlace;
      opts.selectedStatVars = svInfo;
      context.options.set(opts);
      context.preview.setOptions(opts);
    })
    .catch(() => {
      const emptySvInfo = {};
      statVarsList.forEach((sv) => (emptySvInfo[sv] = {}));
      opts.selectedPlace = { dcid: place, name: place, types: [] };
      opts.selectedStatVars = emptySvInfo;
      context.options.set(opts);
      context.preview.setOptions(opts);
    });
}

function updateURL(selectedOptions: DownloadOptions): void {
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

function shouldHideSourceSelector(opts: DownloadOptions): boolean {
  return (
    !opts ||
    _.isEmpty(opts.selectedStatVars) ||
    _.isEmpty(opts.selectedPlace) ||
    _.isEmpty(opts.enclosedPlaceType)
  );
}
