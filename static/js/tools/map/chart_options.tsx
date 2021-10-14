/**
 * Copyright 2021 Google LLC
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
 * Component to allow per capita toggling and navigating to a parent place map.
 */

import {
  CHILD_PLACE_TYPES,
  MAP_REDIRECT_PREFIX,
  updateHashPlaceInfo,
  updateHashStatVar,
} from "./util";
import { Context, NamedTypedPlace, PlaceInfo, StatVar } from "./context";
import { FormGroup, Input, Label } from "reactstrap";
import React, { useContext } from "react";

import { DataPointMetadata } from "./chart_loader";
import _ from "lodash";
import { formatNumber } from "../../i18n/i18n";

const NO_PER_CAPITA_TYPES = ["medianValue"];

interface ChartOptionsPropType {
  dataValues: { [dcid: string]: number };
  placeInfo: PlaceInfo;
  metadata: { [dcid: string]: DataPointMetadata };
  unit: string;
}
export function ChartOptions(props: ChartOptionsPropType): JSX.Element {
  const { statVar } = useContext(Context);
  const selectedPlace = props.placeInfo.selectedPlace;
  const unitString = _.isEmpty(props.unit) ? "" : ` ${props.unit}`;
  const selectedPlaceValue =
    selectedPlace.dcid in props.dataValues
      ? formatNumber(props.dataValues[selectedPlace.dcid], "") + unitString
      : "N/A";
  const selectedPlaceDate =
    selectedPlace.dcid in props.metadata
      ? ` (${props.metadata[selectedPlace.dcid].statVarDate})`
      : "";
  return (
    <div className="chart-options">
      {NO_PER_CAPITA_TYPES.indexOf(statVar.value.info.st) === -1 && (
        <div>
          <FormGroup check>
            <Label check>
              <Input
                id="per-capita"
                type="checkbox"
                checked={statVar.value.perCapita}
                onChange={(e) => statVar.setPerCapita(e.target.checked)}
              />
              Per capita
            </Label>
          </FormGroup>
        </div>
      )}
      <div className="breadcrumbs-title">
        {statVar.value.info.title
          ? statVar.value.info.title
          : statVar.value.dcid}
      </div>
      <div>
        {selectedPlace.name}
        {selectedPlaceDate}: {selectedPlaceValue}
      </div>
      {props.placeInfo.parentPlaces.map((place) => {
        const value =
          place.dcid in props.dataValues
            ? formatNumber(props.dataValues[place.dcid], "") + unitString
            : "N/A";
        const date =
          place.dcid in props.metadata
            ? ` (${props.metadata[place.dcid].statVarDate})`
            : "";
        const redirectLink = getRedirectLink(
          statVar.value,
          place,
          props.placeInfo.mapPointsPlaceType
        );
        return (
          <div key={place.dcid}>
            <a href={redirectLink}>{place.name}</a>
            {date}: {value}
          </div>
        );
      })}
    </div>
  );
}

export function getRedirectLink(
  statVar: StatVar,
  selectedPlace: NamedTypedPlace,
  mapPointsPlaceType: string
): string {
  let hash = updateHashStatVar("", statVar);
  let enclosedPlaceType = "";
  for (const type of selectedPlace.types) {
    if (type in CHILD_PLACE_TYPES) {
      enclosedPlaceType = CHILD_PLACE_TYPES[type][0];
      break;
    }
  }
  hash = updateHashPlaceInfo(hash, {
    enclosingPlace: { name: "", dcid: "" },
    enclosedPlaces: [],
    enclosedPlaceType,
    parentPlaces: [],
    selectedPlace,
    mapPointsPlaceType,
  });
  return `${MAP_REDIRECT_PREFIX}#${encodeURIComponent(hash)}`;
}
