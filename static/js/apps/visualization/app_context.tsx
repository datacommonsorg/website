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
import { ORDERED_VIS_TYPE, VIS_TYPE_CONFIG } from "./vis_type_configs";

const URL_PARAMS = {
  VIS_TYPE: "visType",
  PLACE: "place",
  ENCLOSED_PLACE_TYPE: "placeType",
  STAT_VAR: "sv",
};
const PARAM_VALUE_SEP = "___";
const PARAM_VALUE_TRUE = "1";
const STAT_VAR_PARAM_KEYS = {
  DCID: "dcid",
  PER_CAPITA: "pc",
  LOG: "log",
};

export interface ContextStatVar {
  dcid: string;
  info: StatVarInfo;
  isPerCapita?: boolean;
  isLog?: boolean;
}
export interface AppContextType {
  visType: string;
  places: NamedTypedPlace[];
  enclosedPlaceType: string;
  statVars: ContextStatVar[];
  childPlaceTypes: string[];
  samplePlaces: NamedNode[];
  setVisType: (visType: string) => void;
  setPlaces: (places: NamedTypedPlace[]) => void;
  setEnclosedPlaceType: (enclosedPlaceType: string) => void;
  setStatVars: (statVars: ContextStatVar[]) => void;
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
  const [childPlaceTypes, setChildPlaceTypes] = useState(null);
  const [samplePlaces, setSamplePlaces] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
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
  const visTypeConfig = VIS_TYPE_CONFIG[visType];

  // Gets the value from the url for a param
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
    let placesPromise = Promise.resolve([]);
    let statVarsPromise = Promise.resolve([]);
    let childTypesPromise = Promise.resolve([]);
    let samplePlacesPromise = Promise.resolve([]);
    if (!_.isEmpty(placeDcidsValue)) {
      const placeDcids = placeDcidsValue.split(PARAM_VALUE_SEP);
      placesPromise = Promise.all(
        placeDcids.map((place) => getNamedTypedPlace(place))
      ).then((places) => {
        return places;
      });
      if (!visTypeConfig.skipEnclosedPlaceType) {
        const getChildTypesFn =
          visTypeConfig.getChildTypesFn || getEnclosedPlaceTypes;
        childTypesPromise = placesPromise.then((places) => {
          return getChildTypesPromise(places[0], getChildTypesFn);
        });
      }
      if (!visTypeConfig.skipEnclosedPlaceType && !!enclosedPlaceType) {
        samplePlacesPromise = getSamplePlacesPromise(
          placeDcids[0],
          enclosedPlaceType
        );
      }
    }
    if (!_.isEmpty(svDcidsValue)) {
      const svValues = svDcidsValue
        .split(PARAM_VALUE_SEP)
        .map((sv) => JSON.parse(sv));
      const svDcids = svValues.map((sv) => sv.dcid);
      statVarsPromise = getStatVarInfo(svDcids).then((resp) => {
        const statVars = svValues.map((sv) => {
          if (sv.dcid in resp) {
            return {
              dcid: sv.dcid,
              info: resp[sv.dcid],
              isPerCapita:
                sv[STAT_VAR_PARAM_KEYS.PER_CAPITA] === PARAM_VALUE_TRUE,
              isLog: sv[STAT_VAR_PARAM_KEYS.LOG] === PARAM_VALUE_TRUE,
            };
          }
        });
        return statVars;
      });
    }
    Promise.all([
      placesPromise,
      statVarsPromise,
      childTypesPromise,
      samplePlacesPromise,
    ]).then(([places, statVars, childTypes, samplePlaces]) => {
      setPlaces(places);
      setStatVars(statVars);
      setChildPlaceTypes(childTypes);
      setSamplePlaces(samplePlaces);
      setIsInitializing(false);
    }).catch;
  }, []);

  // when list of places or vistype changes, re-fetch child place types
  useEffect(() => {
    if (isInitializing) {
      return;
    }
    if (_.isEmpty(places) || visTypeConfig.skipEnclosedPlaceType) {
      setChildPlaceTypes(null);
      setSamplePlaces([]);
      return;
    }
    const getChildTypesFn =
      visTypeConfig.getChildTypesFn || getEnclosedPlaceTypes;
    getChildTypesPromise(places[0], getChildTypesFn).then(
      (newChildPlaceTypes) => {
        if (_.isEqual(newChildPlaceTypes, childPlaceTypes)) {
          return;
        }
        setChildPlaceTypes(newChildPlaceTypes);
      }
    );
  }, [places, visTypeConfig]);

  // When child place types updates, update the selected enclosed place type
  useEffect(() => {
    if (isInitializing) {
      return;
    }
    if (_.isEmpty(childPlaceTypes)) {
      setEnclosedPlaceType("");
      return;
    }
    if (childPlaceTypes.findIndex((type) => type === enclosedPlaceType) >= 0) {
      return;
    }
    setEnclosedPlaceType(childPlaceTypes[0]);
  }, [childPlaceTypes, isInitializing]);

  // when list of places, enclosed place type, or vis type changes, update the
  // list of sample places to use for sv hierarchy.
  useEffect(() => {
    if (isInitializing) {
      return;
    }
    if (_.isEmpty(places)) {
      return;
    }
    if (visTypeConfig.skipEnclosedPlaceType) {
      setSamplePlaces(places);
    } else {
      if (!enclosedPlaceType) {
        return;
      }
      getSamplePlacesPromise(places[0].dcid, enclosedPlaceType).then(
        (samplePlaces) => {
          setSamplePlaces(samplePlaces);
        }
      );
    }
  }, [places, enclosedPlaceType, visTypeConfig]);

  // when list of sample places used in the sv hierarchy changes, update the
  // list of selected stat vars
  useEffect(() => {
    if (isInitializing) {
      return;
    }
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
          setStatVars(filteredStatVars);
        }
      });
  }, [samplePlaces, statVars, isInitializing]);

  // when the vis type changes, update the list of places and list of stat vars
  // according to the config for that vis type.
  useEffect(() => {
    if (isInitializing) {
      return;
    }
    if (visTypeConfig.singlePlace && places.length > 1) {
      setPlaces(places.slice(0, 1));
    }
    if (visTypeConfig.numSv && statVars.length > visTypeConfig.numSv) {
      setStatVars(statVars.slice(0, visTypeConfig.numSv));
    }
  }, [visTypeConfig, isInitializing]);

  // when any value in the context changes, update the url hash.
  useEffect(() => {
    if (isInitializing) {
      return;
    }
    const params = {
      [URL_PARAMS.VIS_TYPE]: visType,
      [URL_PARAMS.PLACE]: places
        .map((place) => place.dcid)
        .join(PARAM_VALUE_SEP),
      [URL_PARAMS.ENCLOSED_PLACE_TYPE]: enclosedPlaceType,
      [URL_PARAMS.STAT_VAR]: statVars
        .map((sv) => {
          const svValue = { [STAT_VAR_PARAM_KEYS.DCID]: sv.dcid };
          if (sv.isPerCapita) {
            svValue[STAT_VAR_PARAM_KEYS.PER_CAPITA] = PARAM_VALUE_TRUE;
          }
          if (sv.isLog) {
            svValue[STAT_VAR_PARAM_KEYS.LOG] = PARAM_VALUE_TRUE;
          }
          return JSON.stringify(svValue);
        })
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

function getChildTypesPromise(
  place: NamedTypedPlace,
  getChildTypesFn: (
    place: NamedTypedPlace,
    parentPlaces: NamedTypedPlace[]
  ) => string[]
): Promise<string[]> {
  return getParentPlacesPromise(place.dcid)
    .then((parentPlaces) => {
      return getChildTypesFn(place, parentPlaces);
    })
    .catch(() => {
      return [];
    });
}

function getSamplePlacesPromise(
  placeDcid: string,
  enclosedPlaceType: string
): Promise<NamedNode[]> {
  return getEnclosedPlacesPromise(placeDcid, enclosedPlaceType)
    .then((enclosedPlaces) => {
      const samplePlaces = getSamplePlaces(
        placeDcid,
        enclosedPlaceType,
        enclosedPlaces
      );
      return samplePlaces;
    })
    .catch(() => {
      return [];
    });
}
