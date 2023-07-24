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

import axios from "axios";
import _ from "lodash";
import React, { createContext, useEffect, useRef, useState } from "react";

import { getStatVarInfo, StatVarInfo } from "../../shared/stat_var";
import { NamedNode, NamedTypedPlace } from "../../shared/types";
import { getEnclosedPlaceTypes } from "../../utils/app/visualization_utils";
import {
  getEnclosedPlacesPromise,
  getNamedTypedPlace,
  getParentPlacesPromise,
  getSamplePlaces,
} from "../../utils/place_utils";
import {
  ORDERED_VIS_TYPE,
  VIS_TYPE_SELECTOR_CONFIGS,
} from "./vis_type_configs";

const URL_PARAMS = {
  VIS_TYPE: "visType",
  PLACE: "place",
  ENCLOSED_PLACE_TYPE: "placeType",
  STAT_VAR: "sv",
};
const PARAM_VALUE_SEP = "__";
export interface AppContextType {
  visType: string;
  places: NamedTypedPlace[];
  enclosedPlaceType: string;
  statVars: { dcid: string; info: StatVarInfo }[];
  childPlaceTypes: string[];
  samplePlaces: NamedNode[];
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
  const [enclosedPlaceType, setEnclosedPlaceType] = useState(
    getParamValue(URL_PARAMS.ENCLOSED_PLACE_TYPE) || ""
  );
  const [statVars, setStatVars] = useState([]);
  const [visType, setVisType] = useState(
    getParamValue(URL_PARAMS.VIS_TYPE) || ORDERED_VIS_TYPE[0].valueOf()
  );
  const [childPlaceTypes, setChildPlaceTypes] = useState([]);
  const [samplePlaces, setSamplePlaces] = useState([]);
  const prevSamplePlaces = useRef(samplePlaces);
  const prevStatVars = useRef(statVars);

  const contextValue = {
    places,
    enclosedPlaceType,
    statVars,
    visType,
    childPlaceTypes,
    samplePlaces,
    setPlaces,
    setEnclosedPlaceType,
    setStatVars,
    setVisType,
  };
  const visTypeConfig = VIS_TYPE_SELECTOR_CONFIGS[visType];

  // Gets the value form the url for a param
  function getParamValue(paramKey: string): string {
    const params = new URLSearchParams(
      decodeURIComponent(location.hash).replace("#", "?")
    );
    return params.get(paramKey) || "";
  }

  // Initialize context values from the url parameters
  useEffect(() => {
    const placeDcidsValue = getParamValue(URL_PARAMS.PLACE);
    const svDcidsValue = getParamValue(URL_PARAMS.STAT_VAR);
    if (!_.isEmpty(placeDcidsValue)) {
      const placeDcids = placeDcidsValue.split(PARAM_VALUE_SEP);
      Promise.all(placeDcids.map((place) => getNamedTypedPlace(place))).then(
        (places) => setPlaces(places)
      );
    }
    if (!_.isEmpty(svDcidsValue)) {
      const svDcids = svDcidsValue.split(PARAM_VALUE_SEP);
      getStatVarInfo(svDcids).then((resp) => {
        const statVars = svDcids.map((svDcid) => {
          if (svDcid in resp) {
            return { dcid: svDcid, info: resp[svDcid] };
          }
        });
        setStatVars(statVars);
      });
    }
  }, []);

  // when list of places or vistype changes, re-fetch child place types
  useEffect(() => {
    if (_.isEmpty(places) || visTypeConfig.skipEnclosedPlaceType) {
      setChildPlaceTypes([]);
      setSamplePlaces([]);
      return;
    }
    const getChildTypesFn =
      visTypeConfig.getChildTypesFn || getEnclosedPlaceTypes;
    getParentPlacesPromise(places[0].dcid)
      .then((parentPlaces) => {
        const newChildPlaceTypes = getChildTypesFn(places[0], parentPlaces);
        if (_.isEqual(newChildPlaceTypes, childPlaceTypes)) {
          return;
        }
        setChildPlaceTypes(newChildPlaceTypes);
      })
      .catch(() => {
        setChildPlaceTypes([]);
      });
  }, [places, visTypeConfig]);

  // When child place types updates, update the selected enclosed place type
  useEffect(() => {
    if (_.isEmpty(childPlaceTypes)) {
      setEnclosedPlaceType("");
      return;
    }
    if (childPlaceTypes.findIndex((type) => type === enclosedPlaceType) >= 0) {
      return;
    }
    setEnclosedPlaceType(childPlaceTypes[0]);
  }, [childPlaceTypes]);

  // when list of places, enclosed place type, or vis type changes, update the
  // list of sample places to use for sv hierarchy.
  useEffect(() => {
    if (_.isEmpty(places)) {
      return;
    }
    if (visTypeConfig.skipEnclosedPlaceType) {
      setSamplePlaces(places);
    } else {
      if (!enclosedPlaceType) {
        return;
      }
      getEnclosedPlacesPromise(places[0].dcid, enclosedPlaceType)
        .then((enclosedPlaces) => {
          const samplePlaces = getSamplePlaces(
            places[0].dcid,
            enclosedPlaceType,
            enclosedPlaces
          );
          setSamplePlaces(samplePlaces);
        })
        .catch(() => {
          setSamplePlaces([]);
        });
    }
  }, [places, enclosedPlaceType, visTypeConfig]);

  // when list of sample places used in the sv hierarchy changes, update the
  // list of selected stat vars
  useEffect(() => {
    if (samplePlaces !== prevSamplePlaces.current) {
      prevSamplePlaces.current = samplePlaces;
    }
    if (statVars !== prevStatVars.current) {
      prevStatVars.current = statVars;
    }
    if (_.isEmpty(samplePlaces) || _.isEmpty(statVars)) {
      return;
    }
    axios
      .post("/api/observation/existence", {
        entities: samplePlaces.map((place) => place.dcid),
        variables: statVars.map((sv) => sv.dcid),
      })
      .then((resp) => {
        const availableSVs = new Set();
        for (const sv of statVars) {
          // sv is used if there is even one entity(place) has observations.
          // This is apparently very loose and can be tightened by making this
          // a percentage of all entities.
          let available = false;
          for (const entity in resp.data[sv.dcid]) {
            if (resp.data[sv.dcid][entity]) {
              available = true;
              break;
            }
          }
          if (available) {
            availableSVs.add(sv.dcid);
          }
        }
        const filteredStatVars = statVars.filter((sv) =>
          availableSVs.has(sv.dcid)
        );
        if (!_.isEqual(filteredStatVars, statVars)) {
          setStatVars(statVars.filter((sv) => availableSVs.has(sv.dcid)));
        }
      });
  }, [samplePlaces, statVars]);

  // when the vis type changes, update the list of places and list of stat vars
  // according to the config for that vis type.
  useEffect(() => {
    if (visTypeConfig.singlePlace && places.length > 1) {
      setPlaces(places.slice(0, 1));
    }
    if (visTypeConfig.numSv && statVars.length > visTypeConfig.numSv) {
      setStatVars(statVars.slice(0, visTypeConfig.numSv));
    }
  }, [visTypeConfig]);

  // when any value in the context changes, update the url hash.
  useEffect(() => {
    const params = {
      [URL_PARAMS.VIS_TYPE]: visType,
      [URL_PARAMS.PLACE]: places
        .map((place) => place.dcid)
        .join(PARAM_VALUE_SEP),
      [URL_PARAMS.ENCLOSED_PLACE_TYPE]: enclosedPlaceType,
      [URL_PARAMS.STAT_VAR]: statVars
        .map((sv) => sv.dcid)
        .join(PARAM_VALUE_SEP),
    };
    let hash = "";
    Object.keys(params).forEach((key, idx) => {
      if (_.isEmpty(params[key])) {
        return;
      }
      hash += `${idx === 0 ? "" : "&"}${key}=${params[key]}`;
    });
    const newHash = encodeURIComponent(hash);
    const currentHash = location.hash.replace("#", "");
    if (newHash && newHash !== currentHash) {
      history.pushState({}, "", `/tools/visualization#${newHash}`);
    }
  });

  return (
    <AppContext.Provider value={contextValue}>
      {props.children}
    </AppContext.Provider>
  );
}
