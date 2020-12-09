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
import { Spinner } from "./spinner";
import {
  Context,
  ContextType,
  useContextStore,
  Axis,
  PlaceInfo,
  IsLoadingWrapper,
  EmptyAxis,
  EmptyPlace,
  EmptyDate,
  FieldToAbbreviation,
  DateInfo,
} from "./context";
import { StatsVarNode } from "../timeline_util";

function App(): JSX.Element {
  const { x, y, place, isLoading } = useContext(Context);
  const hideInfo = shouldHideInfo(x.value, y.value, place.value);
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
          <Row>
            <PlotOptions />
          </Row>
          {hideInfo ? (
            <Row id="chart-row">
              <ChartLoader />
            </Row>
          ) : (
            <Row>
              <Info />
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
 * Parses the hash and updates the context accordingly.
 * @param context
 */
function applyHash(context: ContextType) {
  const params = new URLSearchParams(
    decodeURIComponent(location.hash).replace("#", "?")
  );
  context.x.set(applyHashAxis(params, true));
  context.y.set(applyHashAxis(params, false));
  context.place.set(applyHashPlace(params));
  context.date.set(applyHashDate(params));
}

/**
 * Appends "x" or "y" to the key based on `isX`.
 * @param key
 * @param isX
 */
function addSuffix(key: string, isX: boolean) {
  return `${key}${isX ? "x" : "y"}`;
}

/**
 * Uses the parsed hash to produce an `Axis`.
 * @param params
 * @param isX
 */
function applyHashAxis(params: URLSearchParams, isX: boolean): Axis {
  const dcid = params.get(addSuffix(FieldToAbbreviation.statVarDcid, isX));
  if (!dcid) {
    return EmptyAxis;
  }
  const axis = _.cloneDeep(EmptyAxis);

  const node: StatsVarNode = {
    [dcid]: {
      paths: [],
      denominators: [],
    },
  };
  const path = params.get(addSuffix(FieldToAbbreviation.statVarPath, isX));
  if (path) {
    node[dcid].paths = [path.split("-")];
  }
  const denominator = params.get(
    addSuffix(FieldToAbbreviation.statVarDenominator, isX)
  );
  if (denominator) {
    node[dcid].denominators = [denominator];
  }
  axis.statVar = node;

  for (const key of ["name", "log", "perCapita"]) {
    const value = params.get(addSuffix(FieldToAbbreviation[key], isX));
    if (value) {
      axis[key] = value === "1" ? true : value;
    }
  }

  return axis;
}

/**
 * Uses the parsed hash to produce a `PlaceInfo`.
 * @param params
 */
function applyHashPlace(params: URLSearchParams): PlaceInfo {
  const place = _.cloneDeep(EmptyPlace);
  const dcid = params.get(FieldToAbbreviation.enclosingPlaceDcid);
  if (dcid) {
    place.enclosingPlace = {
      dcid: dcid,
      name: params.get(FieldToAbbreviation.enclosingPlaceName),
    };
  }
  const type = params.get(FieldToAbbreviation.enclosedPlaceType);
  if (type) {
    place.enclosedPlaceType = type;
  }
  for (const key of ["lowerBound", "upperBound"]) {
    const value = params.get(FieldToAbbreviation[key]);
    if (value) {
      place[key] = Number.parseInt(value);
    }
  }
  return place;
}

/**
 * Uses the parsed hash to produce a `DateInfo`.
 * @param params
 */
function applyHashDate(params: URLSearchParams): DateInfo {
  const date = _.cloneDeep(EmptyDate);
  for (const key of ["year", "month", "day"]) {
    const value = params.get(FieldToAbbreviation[key]);
    if (value) {
      date[key] = Number.parseInt(value);
    }
  }
  return date;
}

/**
 * Updates the hash based on the context and returns the new hash.
 * @param context
 */
function updateHash(context: ContextType) {
  const x = context.x.value;
  const y = context.y.value;
  const place = context.place.value;
  const date = context.date.value;
  let hash = updateHashAxis("", x, true);
  hash = updateHashAxis(hash, y, false);
  hash = updateHashPlace(hash, place);
  hash = updateHashDate(hash, date);
  if (hash) {
    history.pushState({}, "", `/tools/scatter2#${encodeURIComponent(hash)}`);
  }
}

/**
 * Appends a key-value mapping to the hash.
 * @param hash
 * @param key
 * @param value
 */
function appendEntry(hash: string, key: string, value: string): string {
  return `${hash}&${key}=${value}`;
}

/**
 * Updates the hash based on the axis and returns the new hash.
 * @param hash
 * @param axis
 * @param isX
 */
function updateHashAxis(hash: string, axis: Axis, isX: boolean): string {
  if (_.isEqual(axis, EmptyAxis)) {
    return hash;
  }
  const statVarDcid = _.findKey(axis.statVar);
  if (statVarDcid) {
    hash = appendEntry(
      hash,
      addSuffix(FieldToAbbreviation.statVarDcid, isX),
      statVarDcid
    );
    const node = axis.statVar[statVarDcid];
    if (!_.isEmpty(node.paths)) {
      hash = appendEntry(
        hash,
        addSuffix(FieldToAbbreviation.statVarPath, isX),
        node.paths[0].join("-")
      );
    }
    if (!_.isEmpty(node.denominators)) {
      hash = appendEntry(
        hash,
        addSuffix(FieldToAbbreviation.statVarDenominator, isX),
        node.denominators[0]
      );
    }
    for (const key of ["name", "log", "perCapita"]) {
      if (axis[key]) {
        hash = appendEntry(
          hash,
          addSuffix(FieldToAbbreviation[key], isX),
          axis[key] === true ? "1" : axis[key]
        );
      }
    }
  }
  return hash;
}

/**
 * Updates the hash based on the `PlaceInfo` and returns the new hash.
 * @param hash
 * @param place
 */
function updateHashPlace(hash: string, place: PlaceInfo): string {
  if (_.isEqual(place, EmptyPlace)) {
    return hash;
  }
  if (place.enclosingPlace.dcid) {
    hash = appendEntry(
      hash,
      FieldToAbbreviation.enclosingPlaceDcid,
      place.enclosingPlace.dcid
    );
    hash = appendEntry(
      hash,
      FieldToAbbreviation.enclosingPlaceName,
      place.enclosingPlace.name
    );
  }
  for (const key of ["enclosedPlaceType", "lowerBound", "upperBound"]) {
    if (place[key] !== EmptyPlace[key]) {
      hash = appendEntry(hash, FieldToAbbreviation[key], place[key].toString());
    }
  }
  return hash;
}

/**
 * Updates the hash based on the `DateInfo` and returns the new hash.
 * @param hash
 * @param date
 */
function updateHashDate(hash: string, date: DateInfo) {
  if (_.isEqual(date, EmptyDate)) {
    return hash;
  }
  for (const key of ["year", "month", "day"]) {
    if (date[key]) {
      hash = appendEntry(hash, FieldToAbbreviation[key], date[key].toString());
    }
  }
  return hash;
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
