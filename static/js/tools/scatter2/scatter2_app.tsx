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

import React, { createContext, useState, useEffect } from "react";
import _ from "lodash";
import { Container, Row } from "reactstrap";
import { StatsVarNode } from "../timeline_util";
import { StatVarChooser } from "./scatter2_statvar";
import { PlaceOptions, PlotOptions } from "./scatter2_options";
import { Chart } from "./scatter2_chart";
import { Info } from "./scatter2_info";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

interface Place {
  name: string;
  dcid: string;
}

interface Axis {
  // StatVar to plot for this axis
  statVar: StatsVarNode;
  // Human readable name of the StatVar
  name: string;
  // Data points
  data: Array<number>;
  // Populations for per capita
  populations: Array<number>;
  // Whether to plot on log scale
  log: boolean;
  // Whether to plot per capita values
  perCapita: boolean;
}
const EmptyAxis: Axis = Object.freeze({
  statVar: {},
  name: "",
  data: [],
  populations: [],
  log: false,
  perCapita: false,
});

interface ScatterPlace {
  // Place that encloses the child places to plot
  enclosingPlace: Place;
  // Type of places to plot
  enclosedPlaceType: string;
  // Places to plot
  enclosedPlaces: Array<Place>;
  // Only plot places with populations between these
  lowerBound: number;
  upperBound: number;
}

// Global app state
interface ScatterContextType {
  // X axis
  x: { value: Axis; set: Setter<Axis> };
  // Y axis
  y: { value: Axis; set: Setter<Axis> };
  // Whether to fit a regression curve
  regress: { value: boolean; set: Setter<boolean> };
  place: { value: ScatterPlace; set: Setter<ScatterPlace> };
}

const ScatterContext = createContext({} as ScatterContextType);

function App(): JSX.Element {
  const [x, setX] = useState(EmptyAxis);
  const [y, setY] = useState(EmptyAxis);
  const [perCapita, setPerCapita] = useState(false);
  const [regress, setRegress] = useState(false);
  const [place, setPlace] = useState({
    enclosingPlace: {},
    enclosedPlaceType: "",
    enclosedPlaces: [],
    lowerBound: 0,
    upperBound: 1e10,
  } as ScatterPlace);
  const store = {
    x: { value: x, set: setX },
    y: { value: y, set: setY },
    regress: { value: regress, set: setRegress },
    place: { value: place, set: setPlace },
  };

  function updateHash() {
    let hash = "";
    hash += `x=${JSON.stringify({ ...x, data: [], populations: [] })}`;
    hash += `&y=${JSON.stringify({ ...y, data: [], populations: [] })}`;
    hash += perCapita ? "&pc=1" : "&pc=0";
    hash += regress ? "&regress=1" : "&regress=0";
    hash += `&place=${JSON.stringify({ ...place, enclosedPlaces: [] })}`;
    history.pushState({}, "", `/tools/scatter2#${encodeURIComponent(hash)}`);
  }

  function applyHash() {
    const params = new URLSearchParams(
      decodeURIComponent(location.hash).replace("#", "?")
    );
    const xString = params.get("x");
    if (xString) {
      setX(JSON.parse(xString));
    }
    const yString = params.get("y");
    if (yString) {
      setY(JSON.parse(yString));
    }
    setPerCapita(params.get("pc") === "1");
    setRegress(params.get("regress") === "1");
    const placeString = params.get("place");
    if (placeString) {
      setPlace(JSON.parse(placeString));
    }
  }

  useEffect(applyHash, []);
  useEffect(updateHash, [store]);
  window.onhashchange = applyHash;

  function shouldHideInfo(): boolean {
    return (
      !_.isEmpty(place.enclosedPlaceType) &&
      !_.isEmpty(place.enclosingPlace.dcid) &&
      !_.isEmpty(x.statVar) &&
      !_.isEmpty(y.statVar)
    );
  }

  return (
    <ScatterContext.Provider value={store}>
      <StatVarChooser />
      <div id="plot-container">
        <Container>
          {shouldHideInfo() ? (
            <React.Fragment>
              <Row>
                <PlaceOptions />
              </Row>
              <Row>
                <PlotOptions />
              </Row>
              <Row id="chart-row">
                <Chart />
              </Row>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Row>
                <PlaceOptions />
              </Row>
              <Row>
                <Info />
              </Row>
            </React.Fragment>
          )}
        </Container>
      </div>
    </ScatterContext.Provider>
  );
}

export { App, ScatterContext, EmptyAxis, Axis, Place };
