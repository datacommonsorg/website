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

import * as d3 from "d3";
import _ from "lodash";
import React, { useContext } from "react";
import { Card } from "reactstrap";

import { highlightPlaceToggle } from "../../chart/draw_map_utils";
import { GeoJsonFeature } from "../../chart/types";
import { formatNumberAndUnit } from "../../i18n/i18n";
import { EUROPE_NAMED_TYPED_PLACE } from "../../shared/constants";
import {
  DataPointMetadata,
  NamedPlace,
  NamedTypedPlace,
} from "../../shared/types";
import { MAP_CONTAINER_ID } from "./chart";
import { Context, DisplayOptions, PlaceInfo, StatVar } from "./context";
import {
  getAllChildPlaceTypes,
  getParentPlaces,
  getRedirectLink,
} from "./util";

interface PlaceDetailsPropType {
  breadcrumbDataValues: { [dcid: string]: number };
  mapDataValues: { [dcid: string]: number };
  metadata: { [dcid: string]: DataPointMetadata };
  unit: string;
  geoJsonFeatures: GeoJsonFeature[];
  europeanCountries: Array<NamedPlace>;
}
export function PlaceDetails(props: PlaceDetailsPropType): JSX.Element {
  const { placeInfo, statVar, display } = useContext(Context);

  const selectedPlace = placeInfo.value.selectedPlace;
  const selectedPlaceValue =
    props.breadcrumbDataValues &&
    selectedPlace.dcid in props.breadcrumbDataValues
      ? formatNumberAndUnit(
          props.breadcrumbDataValues[selectedPlace.dcid],
          props.unit
        )
      : "N/A";
  const selectedPlaceDate =
    selectedPlace.dcid in props.metadata
      ? ` (${props.metadata[selectedPlace.dcid].placeStatDate})`
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
                  name: place.properties.name || place.properties.geoDcid,
                  types: [placeInfo.value.enclosedPlaceType],
                },
                props,
                placeInfo.value,
                statVar.value,
                display.value,
                props.unit,
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
                name: place.properties.name || place.properties.geoDcid,
                types: [placeInfo.value.enclosedPlaceType],
              },
              props,
              placeInfo.value,
              statVar.value,
              display.value,
              props.unit,
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
          {placeInfo.value.parentPlaces.map((place) =>
            getListItemElement(
              place,
              props,
              placeInfo.value,
              statVar.value,
              display.value,
              props.unit
            )
          )}
        </div>
      </div>
    </Card>
  );
}

function highlightPlace(e: React.MouseEvent<HTMLAnchorElement>) {
  const target = e.target as HTMLAnchorElement;
  const placeDcid = target.dataset.geodcid;
  highlightPlaceToggle(
    document.getElementById(MAP_CONTAINER_ID),
    placeDcid,
    true
  );
}

function unhighlightPlace(e: React.MouseEvent<HTMLAnchorElement>) {
  const target = e.target as HTMLAnchorElement;
  const placeDcid = target.dataset.geodcid;
  highlightPlaceToggle(
    document.getElementById(MAP_CONTAINER_ID),
    placeDcid,
    false
  );
}

function getListItemElement(
  place: NamedTypedPlace,
  props: PlaceDetailsPropType,
  placeInfo: PlaceInfo,
  statVar: StatVar,
  display: DisplayOptions,
  unit: string,
  itemNumber?: number
): JSX.Element {
  let value = "N/A";
  if (props.breadcrumbDataValues && place.dcid in props.breadcrumbDataValues) {
    value = formatNumberAndUnit(props.breadcrumbDataValues[place.dcid], unit);
  } else if (place.dcid in props.mapDataValues) {
    value = formatNumberAndUnit(props.mapDataValues[place.dcid], unit);
  }
  const date =
    place.dcid in props.metadata
      ? ` (${props.metadata[place.dcid].placeStatDate})`
      : "";
  const enclosingPlace =
    props.europeanCountries.findIndex(
      (country) => country.dcid === place.dcid
    ) > -1
      ? EUROPE_NAMED_TYPED_PLACE
      : placeInfo.enclosingPlace;
  const parentPlaces = getParentPlaces(
    place,
    enclosingPlace,
    placeInfo.parentPlaces
  );
  const redirectLink = getRedirectLink(
    statVar,
    place,
    parentPlaces,
    placeInfo.mapPointPlaceType,
    display
  );
  const shouldBeClickable = !_.isEmpty(
    getAllChildPlaceTypes(place, parentPlaces)
  );
  return (
    <div key={place.dcid}>
      {itemNumber && `${itemNumber}. `}
      {shouldBeClickable ? (
        <a
          href={redirectLink}
          data-geodcid={place.dcid}
          onMouseEnter={highlightPlace}
          onMouseLeave={unhighlightPlace}
        >
          {place.name}
        </a>
      ) : (
        `${place.name}`
      )}
      {date}: {value}
    </div>
  );
}
