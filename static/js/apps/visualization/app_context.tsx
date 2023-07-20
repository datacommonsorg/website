/**
 * Copyright 2023 Google LLC
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
 * Context to hold the global state of the visualization app.
 */

import React, { createContext, useState } from "react";

import { StatVarInfo } from "../../shared/stat_var";
import { NamedTypedPlace } from "../../shared/types";
import { ORDERED_VIS_TYPE } from "./vis_type_configs";

export interface AppContextType {
  visType: string;
  places: NamedTypedPlace[];
  enclosedPlaceType: string;
  statVars: { dcid: string; info: StatVarInfo }[];
  setVisType: (visType: string) => void;
  setPlaces: (places: NamedTypedPlace[]) => void;
  setEnclosedPlaceType: (enclosedPlaceType: string) => void;
  setStatVars: (statVars: { dcid: string; info: StatVarInfo }[]) => void;
}

export const AppContext = createContext({} as AppContextType);

interface AppContextProviderPropType {
  children: React.ReactNode;
}

export function AppContextProvider(
  props: AppContextProviderPropType
): JSX.Element {
  const [places, setPlaces] = useState([]);
  const [enclosedPlaceType, setEnclosedPlaceType] = useState("");
  const [statVars, setStatVars] = useState([]);
  const [visType, setVisType] = useState(ORDERED_VIS_TYPE[0].valueOf());
  const contextValue = {
    places,
    enclosedPlaceType,
    statVars,
    visType,
    setPlaces,
    setEnclosedPlaceType,
    setStatVars,
    setVisType,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {props.children}
    </AppContext.Provider>
  );
}
