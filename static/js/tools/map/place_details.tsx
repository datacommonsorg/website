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

import _ from "lodash";
import React from "react";
import { Card } from "reactstrap";

import { GeoJsonFeature } from "../../chart/types";
import { formatNumber } from "../../i18n/i18n";
import { EUROPE_NAMED_TYPED_PLACE } from "../../shared/constants";
import { DataPointMetadata } from "./chart_loader";
import { DisplayOptions, NamedTypedPlace, PlaceInfo, StatVar } from "./context";
import {
  getAllChildPlaceTypes,
  getParentPlaces,
  getRedirectLink,
} from "./util";

interface PlaceDetailsPropType {
  breadcrumbDataValues: { [dcid: string]: number };
  mapDataValues: { [dcid: string]: number };
  placeInfo: PlaceInfo;
  metadata: { [dcid: string]: DataPointMetadata };
  unit: string;
  statVar: StatVar;
  geoJsonFeatures: GeoJsonFeature[];
  displayOptions: DisplayOptions;
  europeanCountries: Array<string>;
}
export function PlaceDetails(props: PlaceDetailsPropType): JSX.Element {
  const selectedPlace = props.placeInfo.selectedPlace;
  const unitString = _.isEmpty(props.unit) ? "" : ` ${props.unit}`;
  const selectedPlaceValue =
    selectedPlace.dcid in props.breadcrumbDataValues
      ? formatNumber(props.breadcrumbDataValues[selectedPlace.dcid], "") +
        unitString
      : "N/A";
  const selectedPlaceDate =
    selectedPlace.dcid in props.metadata
      ? ` (${props.metadata[selectedPlace.dcid].statVarDate})`
      : "";
  const rankedPlaces = props.geoJsonFeatures.filter(
    (feature) =>
      feature.properties.geoDcid in props.mapDataValues &&
      _.isNumber(props.mapDataValues[feature.properties.geoDcid])
  );
  rankedPlaces.sort(
    (a, b) =>
      props.mapDataValues[b.properties.geoDcid] -
      props.mapDataValues[a.properties.geoDcid]
  );
  return (
    <Card className="place-details-card">
      <div className="place-details">
        <div className="place-details-section">
          <div className="place-details-section-title">Top Places</div>
          {rankedPlaces
            .slice(0, Math.min(5, rankedPlaces.length))
            .map((place, index) =>
              getListItemElement(
                {
                  dcid: place.properties.geoDcid,
                  name: place.properties.name,
                  types: [props.placeInfo.enclosedPlaceType],
                },
                props,
                unitString,
                index + 1
              )
            )}
        </div>
        <div className="place-details-section">
          <div className="place-details-section-title">Bottom Places</div>
          {rankedPlaces.slice(-5).map((place, index) =>
            getListItemElement(
              {
                dcid: place.properties.geoDcid,
                name: place.properties.name,
                types: [props.placeInfo.enclosedPlaceType],
              },
              props,
              unitString,
              Math.max(0, rankedPlaces.length - 5) + index + 1
            )
          )}
        </div>
        <div className="place-details-section">
          <div className="place-details-section-title">Containing Places</div>
          <div>
            {selectedPlace.name}
            {selectedPlaceDate}: {selectedPlaceValue}
          </div>
          {props.placeInfo.parentPlaces.map((place) =>
            getListItemElement(place, props, unitString)
          )}
        </div>
      </div>
    </Card>
  );
}

function getListItemElement(
  place: NamedTypedPlace,
  props: PlaceDetailsPropType,
  unitString: string,
  itemNumber?: number
): JSX.Element {
  let value = "N/A";
  if (place.dcid in props.breadcrumbDataValues) {
    value =
      formatNumber(props.breadcrumbDataValues[place.dcid], "") + unitString;
  } else if (place.dcid in props.mapDataValues) {
    value = formatNumber(props.mapDataValues[place.dcid], "") + unitString;
  }
  const date =
    place.dcid in props.metadata
      ? ` (${props.metadata[place.dcid].statVarDate})`
      : "";
  const enclosingPlace =
    props.europeanCountries.indexOf(place.dcid) > -1
      ? EUROPE_NAMED_TYPED_PLACE
      : props.placeInfo.enclosingPlace;
  const parentPlaces = getParentPlaces(
    place,
    enclosingPlace,
    props.placeInfo.parentPlaces
  );
  const redirectLink = getRedirectLink(
    props.statVar,
    place,
    parentPlaces,
    props.placeInfo.mapPointsPlaceType,
    props.displayOptions
  );
  const shouldBeClickable = !_.isEmpty(
    getAllChildPlaceTypes(place, parentPlaces)
  );
  return (
    <div key={place.dcid}>
      {itemNumber && `${itemNumber}. `}
      {shouldBeClickable ? (
        <a href={redirectLink}>{place.name}</a>
      ) : (
        `${place.name}`
      )}
      {date}: {value}
    </div>
  );
}
