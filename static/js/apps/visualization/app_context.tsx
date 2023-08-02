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
import _, { sample } from "lodash";
import React, { createContext, useEffect, useRef, useState } from "react";

import { getStatVarInfo, StatVarInfo } from "../../shared/stat_var";
import { NamedNode, NamedTypedPlace } from "../../shared/types";
import {
  getEnclosedPlaceTypes,
  getFilteredStatVarPromise,
} from "../../utils/app/visualization_utils";
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
  isContextLoading: boolean;
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
  const [enclosedPlaceType, setEnclosedPlaceType] = useState("");
  const [statVars, setStatVars] = useState([]);
  const [visType, setVisType] = useState(
    getParamValue(URL_PARAMS.VIS_TYPE) || ORDERED_VIS_TYPE[0].valueOf()
  );
  const [childPlaceTypes, setChildPlaceTypes] = useState(null);
  const [samplePlaces, setSamplePlaces] = useState([]);
  const [isContextLoading, setIsContextLoading] = useState(true);
  const prevSamplePlaces = useRef(samplePlaces);
  const prevStatVars = useRef(statVars);
  // List of booleans to track whether or not hash should be updated when
  // places, enclosedPlaceType, statVars, or visType changes. Hash should be
  // updated for user selections and NOT for selections that are auto-magically
  // made
  const shouldUpdateHash = useRef([]);

  const contextValue = {
    places,
    enclosedPlaceType,
    statVars,
    visType,
    childPlaceTypes,
    samplePlaces,
    isContextLoading,
    setPlaces: (places) => {
      shouldUpdateHash.current.push(true);
      setPlaces(places);
    },
    setEnclosedPlaceType: (placeType) => {
      shouldUpdateHash.current.push(true);
      setEnclosedPlaceType(placeType);
    },
    setStatVars: (statVars) => {
      shouldUpdateHash.current.push(true);
      setStatVars(statVars);
    },
    setVisType: (visType) => {
      shouldUpdateHash.current.push(true);
      setVisType(visType);
    },
  };
  const visTypeConfig = VIS_TYPE_CONFIG[visType];

  // Gets the value from the url for a param
  function getParamValue(paramKey: string): string {
    const params = new URLSearchParams(
      decodeURIComponent(location.hash).replace("#", "?")
    );
    return params.get(paramKey) || "";
  }

  useEffect(() => {
    // Update context value based off url on initial load
    updateContextValue();

    // Update the context value based off the url whenever the window history
    // state changes (i.e., forward or back buttons are clicked)
    window.addEventListener("popstate", updateContextValue);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("popstate", updateContextValue);
    };
  }, []);

  // when list of places or vistype changes, re-fetch child place types
  useEffect(() => {
    if (isContextLoading) {
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
    if (isContextLoading || childPlaceTypes === null) {
      return;
    }
    let newEnclosedPlaceType = "";
    if (!_.isEmpty(childPlaceTypes)) {
      newEnclosedPlaceType =
        childPlaceTypes.findIndex((type) => type === enclosedPlaceType) >= 0
          ? enclosedPlaceType
          : childPlaceTypes[0];
    }
    if (newEnclosedPlaceType !== enclosedPlaceType) {
      shouldUpdateHash.current.push(false);
      setEnclosedPlaceType(newEnclosedPlaceType);
    }
  }, [childPlaceTypes, isContextLoading]);

  // when list of places, enclosed place type, or vis type changes, update the
  // list of sample places to use for sv hierarchy.
  useEffect(() => {
    if (isContextLoading || _.isEmpty(places)) {
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
    if (isContextLoading) {
      return;
    }
    if (samplePlaces !== prevSamplePlaces.current) {
      prevSamplePlaces.current = samplePlaces;
    }
    if (statVars !== prevStatVars.current) {
      prevStatVars.current = statVars;
    }
    getFilteredStatVarPromise(samplePlaces, statVars, visTypeConfig).then(
      (filteredStatVars) => {
        if (!_.isEqual(filteredStatVars, statVars)) {
          shouldUpdateHash.current.push(false);
          setStatVars(filteredStatVars);
        }
      }
    );
  }, [samplePlaces, statVars]);

  // when the vis type changes, update the list of places and list of stat vars
  // according to the config for that vis type.
  useEffect(() => {
    if (isContextLoading) {
      return;
    }
    if (visTypeConfig.singlePlace && places.length > 1) {
      shouldUpdateHash.current.push(false);
      setPlaces(places.slice(0, 1));
    }
    if (visTypeConfig.numSv && statVars.length > visTypeConfig.numSv) {
      shouldUpdateHash.current.push(false);
      setStatVars(statVars.slice(0, visTypeConfig.numSv));
    }
  }, [visTypeConfig]);

  // when values in the context changes, update the url hash.
  useEffect(() => {
    if (isContextLoading || !shouldUpdateHash.current.shift()) {
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
    // For all values in this dependency array, setting the value should always
    // be preceded by shouldUpdateHash.current.push()
  }, [places, enclosedPlaceType, statVars, visType]);

  return (
    <AppContext.Provider value={contextValue}>
      {props.children}
    </AppContext.Provider>
  );

  // Updates context values based off URL params
  function updateContextValue(): void {
    setIsContextLoading(true);
    const placeDcidsValue = getParamValue(URL_PARAMS.PLACE);
    const svDcidsValue = getParamValue(URL_PARAMS.STAT_VAR);
    const enclosedPlaceTypeValue = getParamValue(
      URL_PARAMS.ENCLOSED_PLACE_TYPE || ""
    );
    let placesPromise = Promise.resolve([]);
    let statVarsPromise = Promise.resolve([]);
    let childTypesPromise = Promise.resolve(null);
    let samplePlacesPromise = Promise.resolve([]);
    let enclosedPlaceTypePromise = Promise.resolve(enclosedPlaceTypeValue);
    if (!_.isEmpty(placeDcidsValue)) {
      // place promise gets the NamedTypedPlace for each place dcid from
      // the URL
      const placeDcids = placeDcidsValue.split(PARAM_VALUE_SEP);
      placesPromise = Promise.all(
        placeDcids.map((place) => getNamedTypedPlace(place))
      ).then((places) => {
        return places;
      });
      if (!visTypeConfig.skipEnclosedPlaceType) {
        // childTypesPromise gets getChildTypes after place promise completes
        const getChildTypesFn =
          visTypeConfig.getChildTypesFn || getEnclosedPlaceTypes;
        childTypesPromise = placesPromise.then((places) => {
          return getChildTypesPromise(places[0], getChildTypesFn);
        });
        // enclosedPlaceTypePromise gets the enclosed place type once
        // childTypesPromise completes
        enclosedPlaceTypePromise = childTypesPromise.then((childTypes) => {
          let enclosedPlaceType = "";
          if (!_.isEmpty(childTypes)) {
            enclosedPlaceType =
              childTypes.findIndex((type) => type === enclosedPlaceTypeValue) >=
              0
                ? enclosedPlaceTypeValue
                : childTypes[0];
          }
          return enclosedPlaceType;
        });
      }
      // if this vis type skips enclosed place type, samplePlacesPromise is the
      // same as the placesPromise. otherwise, get sample places after
      // enclosedPlaceTypePromise completes
      samplePlacesPromise = visTypeConfig.skipEnclosedPlaceType
        ? placesPromise
        : enclosedPlaceTypePromise.then((enclosedPlaceType) => {
            return getSamplePlacesPromise(placeDcids[0], enclosedPlaceType);
          });
    }
    if (!_.isEmpty(svDcidsValue)) {
      const svValues = svDcidsValue
        .split(PARAM_VALUE_SEP)
        .map((sv) => JSON.parse(sv));
      const svDcids = svValues.map((sv) => sv.dcid);
      // allStatVarsPromise gets the stat var info for every dcid in the URL
      const allStatVarsPromise = getStatVarInfo(svDcids).then((resp) => {
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
      // statVarsPromise gets the filtered stat vars once both
      // allStatVarsPromise and samplePlacesPromise completes
      statVarsPromise = Promise.all([
        allStatVarsPromise,
        samplePlacesPromise,
      ]).then(([statVars, samplePlaces]) => {
        return getFilteredStatVarPromise(samplePlaces, statVars, visTypeConfig);
      });
    }
    // once every promise completes, set the values to the context
    Promise.all([
      placesPromise,
      statVarsPromise,
      childTypesPromise,
      samplePlacesPromise,
      enclosedPlaceTypePromise,
    ])
      .then(
        ([places, statVars, childTypes, samplePlaces, enclosedPlaceType]) => {
          const slicedPlaces = visTypeConfig.singlePlace
            ? places.slice(0, 1)
            : places;
          const slicedSv = visTypeConfig.numSv
            ? statVars.slice(0, visTypeConfig.numSv)
            : statVars;
          setEnclosedPlaceType(enclosedPlaceType);
          setPlaces(slicedPlaces);
          setStatVars(slicedSv);
          setChildPlaceTypes(childTypes);
          setSamplePlaces(samplePlaces);
          setIsContextLoading(false);
        }
      )
      .catch(() => {
        setIsContextLoading(false);
      });
  }
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

// Gets a promise that returns sample places for a place and enclosed place type
function getSamplePlacesPromise(
  placeDcid: string,
  enclosedPlaceType: string
): Promise<NamedNode[]> {
  if (!placeDcid || !enclosedPlaceType) {
    return Promise.resolve([]);
  }
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
