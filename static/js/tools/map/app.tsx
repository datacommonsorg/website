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

import React, { useContext, useEffect } from "react";
import { Context, ContextType, getInitialContext } from "./context";
import { Container, Row } from "reactstrap";
import _ from "lodash";
import { PlaceOptions } from "./place_options";
import {
  applyHashPlaceInfo,
  applyHashStatVarInfo,
  MAP_REDIRECT_PREFIX,
  updateHashPlaceInfo,
  updateHashStatVarInfo,
} from "./util";
import { ChartLoader } from "./chart_loader";
import { Info } from "./info";

function App(): JSX.Element {
  const { statVarInfo, placeInfo, isLoading } = useContext(Context);
  const showChart =
    !_.isEmpty(statVarInfo.value.statVar) &&
    !_.isEmpty(placeInfo.value.enclosedPlaces);
  const showLoadingSpinner =
    isLoading.value.isDataLoading || isLoading.value.isPlaceInfoLoading;
  return (
    <>
      <div id="plot-container">
        <Container>
          {!showChart && (
            <Row>
              <h1 className="mb-4">Map Explorer</h1>
            </Row>
          )}
          <Row>
            <PlaceOptions />
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
  context.statVarInfo.set(applyHashStatVarInfo(params));
}

function updateHash(context: ContextType): void {
  let hash = updateHashStatVarInfo("", context.statVarInfo.value);
  hash = updateHashPlaceInfo(hash, context.placeInfo.value);
  const newHash = encodeURIComponent(hash);
  const currentHash = location.hash.replace("#", "");
  if (newHash && newHash !== currentHash) {
    history.pushState({}, "", `${MAP_REDIRECT_PREFIX}#${newHash}`);
  }
}
