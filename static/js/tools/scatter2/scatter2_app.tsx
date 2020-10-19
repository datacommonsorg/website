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

import React, { createContext, useState } from "react";
import { Container, Row } from "reactstrap";
import { StatsVarNode } from "../timeline_util";
import { StatVarChooser } from "./scatter2_statvar";
import { Options } from "./scatter2_options";
import { ScatterChart } from "./scatter2_chart";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

interface Place {
  name: string;
  dcid: string;
}

interface Axis {
  // StatVar to plot for this axis
  statVar: StatsVarNode;
  // Data points
  data: Array<number>;
  // Whether to plot on log scale
  log: boolean;
}

interface ScatterPlace {
  // Place that encloses the child places to plot
  enclosingPlace: Place;
  // Type of places to plot
  enclosedPlaceType: string;
  // Places to plot
  enclosedPlaces: Array<string>;
  // Country of the places to plot
  country: string;
}

// Global app state
interface ScatterContextType {
  // X axis
  x: { value: Axis; set: Setter<Axis> };
  // Y axis
  y: { value: Axis; set: Setter<Axis> };
  // Whether to plot per capita values
  perCapita: { value: boolean; set: Setter<boolean> };
  // Whether to fit a regression curve
  regress: { value: boolean; set: Setter<boolean> };
  place: { value: ScatterPlace; set: Setter<ScatterPlace> };
}

const ScatterContext = createContext({} as ScatterContextType);

function App(): JSX.Element {
  // const [pickStatVarX, setPickStatVarX] = useState(false);
  // const [pickStatVarY, setPickStatVarY] = useState(false);
  const [x, setX] = useState({
    statVar: {},
    data: {},
    log: false,
  } as Axis);
  const [y, setY] = useState({
    statVar: {},
    data: {},
    log: false,
  } as Axis);
  const [perCapita, setPerCapita] = useState(false);
  const [regress, setRegress] = useState(false);
  const [place, setPlace] = useState({
    enclosingPlace: {},
    enclosedPlaceType: "",
    enclosedPlaces: [],
    country: "",
  } as ScatterPlace);
  const store = {
    x: { value: x, set: setX },
    y: { value: y, set: setY },
    perCapita: { value: perCapita, set: setPerCapita },
    regress: { value: regress, set: setRegress },
    place: { value: place, set: setPlace },
  };
  return (
    <ScatterContext.Provider value={store}>
      <StatVarChooser />
      <div id="plot-container">
        <Container>
          <Row>
            <Options />
          </Row>
          <Row>
            <ScatterChart />
          </Row>
        </Container>
      </div>
    </ScatterContext.Provider>
  );
}

export { App, ScatterContext };
