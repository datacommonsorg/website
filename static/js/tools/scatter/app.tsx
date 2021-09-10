/**
 * Copyright 2020 Google LLC
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
 * Main app component for scatter.
 */

import React, { useContext, useEffect } from "react";
import _ from "lodash";
import { Container, Row } from "reactstrap";
import { StatVarChooser } from "./statvar";
import { PlaceOptions } from "./place_options";
import { ChartLoader } from "./chart_loader";
import { Info } from "./info";
import { Spinner } from "./spinner";
import {
  Context,
  useContextStore,
  Axis,
  PlaceInfo,
  IsLoadingWrapper,
} from "./context";
import { updateHash, applyHash, isPlacePicked } from "./util";

function App(): JSX.Element {
  const { x, y, place, isLoading } = useContext(Context);
  const showChart = shouldShowChart(x.value, y.value, place.value);
  const showChooseStatVarMessage = shouldShowChooseStatVarMessage(
    x.value,
    y.value,
    place.value
  );
  const showInfo = !showChart && !showChooseStatVarMessage;
  return (
    <div>
      <StatVarChooser />
      <div id="plot-container">
        <Container>
          {!showChart && (
            <Row>
              <h1 className="mb-4">Scatter Plot Explorer</h1>
            </Row>
          )}
          <Row>
            <PlaceOptions />
          </Row>
          {showChooseStatVarMessage && (
            <Row className="info-message">
              Choose 2 statistical variables from the left pane.
            </Row>
          )}
          {showInfo && (
            <Row>
              <Info />
            </Row>
          )}
          {showChart && (
            <Row id="chart-row">
              <ChartLoader />
            </Row>
          )}
        </Container>
      </div>
      <Spinner isOpen={shouldDisplaySpinner(isLoading)} />
    </div>
  );
}

function AppWithContext(): JSX.Element {
  const store = useContextStore();

  useEffect(() => applyHash(store), []);
  useEffect(() => updateHash(store), [store]);
  window.onhashchange = () => applyHash(store);

  return (
    <Context.Provider value={store}>
      <App />
    </Context.Provider>
  );
}

/**
 * Returns whether the spinner should be shown.
 * @param isLoading
 */
function shouldDisplaySpinner(isLoading: IsLoadingWrapper): boolean {
  return (
    isLoading.arePlacesLoading ||
    isLoading.areStatVarsLoading ||
    isLoading.areDataLoading
  );
}

/**
 * Checks if the info page should be hidden to display the chart.
 * Returns true if the enclosing place, child place type,
 * and statvars for the x and y axes are selected.
 * @param x
 * @param y
 * @param place
 */
function shouldShowChart(x: Axis, y: Axis, place: PlaceInfo): boolean {
  return (
    isPlacePicked(place) && !_.isNull(x.statVarInfo) && !_.isNull(y.statVarInfo)
  );
}

function shouldShowChooseStatVarMessage(
  x: Axis,
  y: Axis,
  place: PlaceInfo
): boolean {
  return (
    isPlacePicked(place) && (_.isNull(x.statVarInfo) || _.isNull(y.statVarInfo))
  );
}

export { App, AppWithContext };
