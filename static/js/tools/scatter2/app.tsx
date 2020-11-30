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
 * Main app component for scatter2.
 */

import React, { useContext, useEffect } from "react";
import _ from "lodash";
import { Container, Row } from "reactstrap";
import { StatVarChooser } from "./statvar";
import { PlaceOptions } from "./place_options";
import { PlotOptions } from "./plot_options";
import { ChartLoader } from "./chart_loader";
import { Info } from "./info";
import {
  Context,
  ContextType,
  useContextStore,
  Axis,
  PlaceInfo,
} from "./context";

function App(): JSX.Element {
  const context = useContext(Context);
  const hideInfo = shouldHideInfo(
    context.x.value,
    context.y.value,
    context.place.value
  );
  return (
    <div>
      <StatVarChooser />
      <div id="plot-container">
        <Container>
          {!hideInfo && (
            <Row>
              <h1 className="mb-4">Scatter Plot Tool</h1>
            </Row>
          )}
          <Row>
            <PlaceOptions />
          </Row>
          {hideInfo ? (
            <React.Fragment>
              <Row>
                <PlotOptions />
              </Row>
              <Row id="chart-row">
                <ChartLoader />
              </Row>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Row>
                <Info />
              </Row>
            </React.Fragment>
          )}
        </Container>
      </div>
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
 * Parses the current hash and updates the context accordingly.
 * @param context
 */
function applyHash(context: ContextType) {
  const params = new URLSearchParams(
    decodeURIComponent(location.hash).replace("#", "?")
  );
  const xString = params.get("x");
  if (xString) {
    context.x.set(JSON.parse(xString));
  }
  const yString = params.get("y");
  if (yString) {
    context.y.set(JSON.parse(yString));
  }
  const placeString = params.get("place");
  if (placeString) {
    context.place.set(JSON.parse(placeString));
  }
}

/**
 * Updates the hash based on the context.
 * @param context
 */
function updateHash(context: ContextType) {
  let hash = "";
  hash += `x=${JSON.stringify({
    ...context.x.value,
    data: [],
    populations: [],
  })}`;
  hash += `&y=${JSON.stringify({
    ...context.y.value,
    data: [],
    populations: [],
  })}`;
  hash += `&place=${JSON.stringify({
    ...context.place.value,
    enclosedPlaces: [],
  })}`;
  history.pushState({}, "", `/tools/scatter2#${encodeURIComponent(hash)}`);
}

/**
 * Checks if the info page should be hidden to display the chart.
 * Returns true if the enclosing place, child place type, and
 * statvars for the x and y axes are selected.
 * @param x
 * @param y
 * @param place
 */
function shouldHideInfo(x: Axis, y: Axis, place: PlaceInfo): boolean {
  return (
    !_.isEmpty(place.enclosedPlaceType) &&
    !_.isEmpty(place.enclosingPlace.dcid) &&
    !_.isEmpty(x.statVar) &&
    !_.isEmpty(y.statVar)
  );
}

export { App, AppWithContext };
