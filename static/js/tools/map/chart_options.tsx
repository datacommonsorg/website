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

import React, { useContext } from "react";
import { Context, ParentPlace, PlaceInfo, StatVarInfo } from "./context";
import { FormGroup, Label, Input } from "reactstrap";
import _ from "lodash";
import { formatNumber } from "../../i18n/i18n";
import {
  updateHashPlaceInfo,
  updateHashStatVarInfo,
  USA_CHILD_PLACE_TYPES,
  MAP_REDIRECT_PREFIX,
} from "./util";

interface ChartOptionsPropType {
  dataValues: { [dcid: string]: number };
  placeInfo: PlaceInfo;
  statVarDates: { [dcid: string]: string };
  unit: string;
}
export function ChartOptions(props: ChartOptionsPropType): JSX.Element {
  const { statVarInfo } = useContext(Context);
  const enclosingPlace = props.placeInfo.enclosingPlace;
  const enclosingPlaceValue =
    enclosingPlace.dcid in props.dataValues
      ? formatNumber(props.dataValues[enclosingPlace.dcid], props.unit)
      : "N/A";
  const enclosingPlaceDate =
    enclosingPlace.dcid in props.statVarDates
      ? ` (${props.statVarDates[enclosingPlace.dcid]})`
      : "";
  const parentPlaces = !_.isEmpty(props.placeInfo.parentPlaces)
    ? props.placeInfo.parentPlaces.reverse()
    : [];
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
        {enclosingPlace.name}
        {enclosingPlaceDate}: {enclosingPlaceValue}
      </div>
      {parentPlaces.map((place) => {
        const value =
          place.dcid in props.dataValues
            ? formatNumber(props.dataValues[place.dcid], props.unit)
            : "N/A";
        const date =
          place.dcid in props.statVarDates
            ? ` (${props.statVarDates[place.dcid]})`
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
  place: ParentPlace
): string {
  let hash = updateHashStatVarInfo("", statVarInfo);
  const enclosingPlace = {
    dcid: place.dcid,
    name: place.name,
  };
  let enclosedPlaceType = "";
  for (const type of place.types) {
    if (type in USA_CHILD_PLACE_TYPES) {
      enclosedPlaceType = USA_CHILD_PLACE_TYPES[type][0];
      break;
    }
  }
  hash = updateHashPlaceInfo(hash, {
    enclosedPlaces: [],
    enclosedPlaceType,
    enclosingPlace,
    parentPlaces: [],
  });
  return `${MAP_REDIRECT_PREFIX}#${encodeURIComponent(hash)}`;
}
