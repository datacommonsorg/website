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
import { StatsVarNode } from "../timeline_util";
import { StatVarChooser } from "./scatter2_statvar";
import { Options } from "./scatter2_options";
interface ScatterData {
  [key: string]: number; // Keyed by DCID
}

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

// Global app state
interface ScatterContextType {
  // Whether to show StatVar menu for X axis
  // pickStatVarX: { value: boolean; set: Setter<boolean> };
  // Whether to show StatVar menu for Y axis
  // pickStatVarY: { value: boolean; set: Setter<boolean> };
  // StatVar for X axis
  statVarX: { value: StatsVarNode; set: Setter<StatsVarNode> };
  // StatVar for Y axis
  statVarY: { value: StatsVarNode; set: Setter<StatsVarNode> };
  // Data for X axis
  dataX: { value: ScatterData; set: Setter<ScatterData> };
  // Data for Y axis
  dataY: { value: ScatterData; set: Setter<ScatterData> };
  // Whether to plot X axis in log scale
  logX: { value: boolean; set: Setter<boolean> };
  // Whether to plot Y axis in log scale
  logY: { value: boolean; set: Setter<boolean> };
  // Whether to plot per capita values
  perCapita: { value: boolean; set: Setter<boolean> };
  // Whether to fit a regression curve
  regress: { value: boolean; set: Setter<boolean> };
  // Place that encloses the child places to plot
  enclosingPlace: { value: string; set: Setter<string> };
  // Type of places to plot
  enclosedPlaceType: { value: string; set: Setter<string> };
  // Country of the places to plot
  country: { value: string; set: Setter<string> };
}

const ScatterContext = createContext({} as ScatterContextType);

function App(): JSX.Element {
  // const [pickStatVarX, setPickStatVarX] = useState(false);
  // const [pickStatVarY, setPickStatVarY] = useState(false);
  const [statVarX, setStatVarX] = useState({} as StatsVarNode);
  const [statVarY, setStatVarY] = useState({} as StatsVarNode);
  const [dataX, setDataX] = useState({} as ScatterData);
  const [dataY, setDataY] = useState({} as ScatterData);
  const [logX, setLogX] = useState(false);
  const [logY, setLogY] = useState(false);
  const [perCapita, setPerCapita] = useState(false);
  const [regress, setRegress] = useState(false);
  const [enclosingPlace, setEnclosingPlace] = useState("");
  const [enclosedPlaceType, setEnclosedPlaceType] = useState("");
  const [country, setCountry] = useState("");
  const store = {
    // pickStatVarX: { value: pickStatVarX, set: setPickStatVarX },
    // pickStatVarY: { value: pickStatVarY, set: setPickStatVarY },
    statVarX: { value: statVarX, set: setStatVarX },
    statVarY: { value: statVarY, set: setStatVarY },
    dataX: { value: dataX, set: setDataX },
    dataY: { value: dataY, set: setDataY },
    logX: { value: logX, set: setLogX },
    logY: { value: logY, set: setLogY },
    perCapita: { value: perCapita, set: setPerCapita },
    regress: { value: regress, set: setRegress },
    enclosingPlace: { value: enclosingPlace, set: setEnclosingPlace },
    enclosedPlaceType: { value: enclosedPlaceType, set: setEnclosedPlaceType },
    country: { value: country, set: setCountry },
  };
  return (
    <ScatterContext.Provider value={store}>
      <StatVarChooser />
      <div id="plot-container">
        <Options />
      </div>
    </ScatterContext.Provider>
  );
}

export { App, ScatterContext };
