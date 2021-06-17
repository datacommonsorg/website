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

import React, { useContext } from "react";
import { Context, NamedTypedPlace, PlaceInfo, StatVarInfo } from "./context";
import { FormGroup, Label, Input } from "reactstrap";
import { formatNumber } from "../../i18n/i18n";
import {
  updateHashPlaceInfo,
  updateHashStatVarInfo,
  USA_CHILD_PLACE_TYPES,
  MAP_REDIRECT_PREFIX,
} from "./util";
import { DataPointMetadata } from "./chart_loader";

interface ChartOptionsPropType {
  dataValues: { [dcid: string]: number };
  placeInfo: PlaceInfo;
  metadata: { [dcid: string]: DataPointMetadata };
  unit: string;
}
export function ChartOptions(props: ChartOptionsPropType): JSX.Element {
  const { statVarInfo } = useContext(Context);
  const selectedPlace = props.placeInfo.selectedPlace;
  const selectedPlaceValue =
    selectedPlace.dcid in props.dataValues
      ? formatNumber(props.dataValues[selectedPlace.dcid], props.unit)
      : "N/A";
  const selectedPlaceDate =
    selectedPlace.dcid in props.metadata
      ? ` (${props.metadata[selectedPlace.dcid].statVarDate})`
      : "";
  return (
    <div className="chart-options">
      <div>
        <FormGroup check>
          <Label check>
            <Input
              id="per-capita"
              type="checkbox"
              checked={statVarInfo.value.perCapita}
              onChange={(e) => statVarInfo.setPerCapita(e.target.checked)}
            />
            Per capita
          </Label>
        </FormGroup>
      </div>
      <div className="breadcrumbs-title">{statVarInfo.value.name}</div>
      <div>
        {selectedPlace.name}
        {selectedPlaceDate}: {selectedPlaceValue}
      </div>
      {props.placeInfo.parentPlaces.map((place) => {
        const value =
          place.dcid in props.dataValues
            ? formatNumber(props.dataValues[place.dcid], props.unit)
            : "N/A";
        const date =
          place.dcid in props.metadata
            ? ` (${props.metadata[place.dcid].statVarDate})`
            : "";
        const redirectLink = getRedirectLink(statVarInfo.value, place);
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
  statVarInfo: StatVarInfo,
  selectedPlace: NamedTypedPlace
): string {
  let hash = updateHashStatVarInfo("", statVarInfo);
  let enclosedPlaceType = "";
  for (const type of selectedPlace.types) {
    if (type in USA_CHILD_PLACE_TYPES) {
      enclosedPlaceType = USA_CHILD_PLACE_TYPES[type][0];
      break;
    }
  }
  hash = updateHashPlaceInfo(hash, {
    enclosingPlace: { name: "", dcid: "" },
    enclosedPlaces: [],
    enclosedPlaceType,
    parentPlaces: [],
    selectedPlace,
  });
  return `${MAP_REDIRECT_PREFIX}#${encodeURIComponent(hash)}`;
}
