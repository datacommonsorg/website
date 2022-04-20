/**
 * Copyright 2021 Google LLC
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
 * Main app component for map explorer.
 */

import _ from "lodash";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Container, Row } from "reactstrap";

import { BQ_QUERY_HEADER_COMMENT, setUpBqButton } from "../shared/bq_utis";
import { ChartLoader } from "./chart_loader";
import { Context, ContextType, getInitialContext } from "./context";
import { Info } from "./info";
import { PlaceOptions } from "./place_options";
import { StatVarChooser } from "./stat_var_chooser";
import {
  applyHashDisplay,
  applyHashPlaceInfo,
  applyHashStatVar,
  MAP_REDIRECT_PREFIX,
  updateHashDisplay,
  updateHashPlaceInfo,
  updateHashStatVar,
} from "./util";

function App(): JSX.Element {
  const { statVar, placeInfo, isLoading } = useContext(Context);
  const showChart =
    !_.isNull(statVar.value.info) &&
    !_.isEmpty(placeInfo.value.enclosingPlace.dcid) &&
    !_.isEmpty(placeInfo.value.enclosedPlaceType);
  const showLoadingSpinner =
    isLoading.value.isDataLoading || isLoading.value.isPlaceInfoLoading;
  const [isSvModalOpen, updateSvModalOpen] = useState(false);
  const toggleSvModalCallback = () => updateSvModalOpen(!isSvModalOpen);

  // Show the BigQuery button when there is a chart
  return (
    <>
      <StatVarChooser
        openSvHierarchyModal={isSvModalOpen}
        openSvHierarchyModalCallback={toggleSvModalCallback}
      />
      <div id="plot-container">
        <Container fluid={true}>
          {!showChart && (
            <Row>
              <h1 className="mb-4">Map Explorer</h1>
            </Row>
          )}
          <Row>
            <PlaceOptions toggleSvHierarchyModal={toggleSvModalCallback} />
          </Row>
          {!showChart && (
            <Row>
              <Info />
            </Row>
          )}
          {showChart && (
            <Row id="chart-row">
              <ChartLoader />
            </Row>
          )}
          <div
            id="screen"
            style={{ display: showLoadingSpinner ? "block" : "none" }}
          >
            <div id="spinner"></div>
          </div>
        </Container>
      </div>
    </>
  );
}

export function AppWithContext(): JSX.Element {
  const params = new URLSearchParams(
    decodeURIComponent(location.hash).replace("#", "?")
  );
  const store = getInitialContext(params);

  useEffect(() => updateHash(store), [store]);
  window.onhashchange = () => applyHash(store);

  return (
    <Context.Provider value={store}>
      <App />
    </Context.Provider>
  );
}

function applyHash(context: ContextType): void {
  const params = new URLSearchParams(
    decodeURIComponent(location.hash).replace("#", "?")
  );
  context.placeInfo.set(applyHashPlaceInfo(params));
  context.statVar.set(applyHashStatVar(params));
  context.display.set(applyHashDisplay(params));
}

function updateHash(context: ContextType): void {
  let hash = updateHashStatVar("", context.statVar.value);
  hash = updateHashPlaceInfo(hash, context.placeInfo.value);
  hash = updateHashDisplay(hash, context.display.value);
  const newHash = encodeURIComponent(hash);
  const currentHash = location.hash.replace("#", "");
  if (newHash && newHash !== currentHash) {
    history.pushState({}, "", `${MAP_REDIRECT_PREFIX}#${newHash}`);
  }
}
