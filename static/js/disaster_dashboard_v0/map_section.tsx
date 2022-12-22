/**
 * Copyright 2022 Google LLC
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
 * Component for the map section of the disaster dashboard
 */

import * as d3 from "d3";
import _ from "lodash";
import React, { useEffect, useRef } from "react";

import { addMapPoints, drawD3Map, getProjection } from "../chart/draw_d3_map";
import { GeoJsonData, GeoJsonFeatureProperties } from "../chart/types";
import { USA_PLACE_DCID } from "../shared/constants";
import { NamedPlace } from "../shared/types";
import { removeSpinner } from "../shared/util";
import { isChildPlaceOf } from "../tools/shared_util";
import {
  DisasterEventMapPlaceInfo,
  DisasterEventPoint,
} from "../types/disaster_event_map_types";
import {
  canClickRegion,
  onPointClicked,
} from "../utils/disaster_event_map_utils";
import { CONTENT_SPINNER_ID, DisasterType } from "./constants";

const MAP_ID = "disaster-dashboard-map";
const LEGEND_CONTAINER_ID = "disaster-dashboard-legend";
const ZOOM_IN_BUTTON_ID = "zoom-in-button";
const ZOOM_OUT_BUTTON_ID = "zoom-out-button";

const DISASTER_COLORS = {
  [DisasterType.EARTHQUAKE]: "red",
  [DisasterType.FIRE]: "orange",
  [DisasterType.STORM]: "yellow",
  [DisasterType.FLOOD]: "green",
  [DisasterType.DROUGHT]: "blue",
};

interface MapSectionPropType {
  // list of disaster event points to show
  disasterEventPoints: DisasterEventPoint[];
  // geojson of the map to render
  geoJson: GeoJsonData;
  // disaster type shown
  selectedDisaster: DisasterType;
  // info about the places to be shown on the map
  selectedPlaceInfo: DisasterEventMapPlaceInfo;
  // prop to use for the intensity of each event
  selectedIntensityProp: string;
  // callback function when a new place has been selected
  onPlaceUpdated: (place: NamedPlace) => void;
  // list of countries in Europe
  fetchedEuropeanPlaces: NamedPlace[];
}

export function MapSection(props: MapSectionPropType): JSX.Element {
  const svgContainer = useRef(null);
  const infoCardRef = useRef(null);

  useEffect(() => {
    if (
      _.isEmpty(props.geoJson) ||
      props.geoJson.properties.current_geo !==
        props.selectedPlaceInfo.selectedPlace.dcid
    ) {
      return;
    }
    draw();
    removeSpinner(CONTENT_SPINNER_ID);
  }, [
    props.disasterEventPoints,
    props.geoJson,
    props.selectedPlaceInfo.selectedPlace.dcid,
  ]);

  if (_.isEmpty(props.geoJson)) {
    removeSpinner(CONTENT_SPINNER_ID);
    return (
      <div className="disaster-dashboard-map-section">
        <div className="error-message">
          Sorry, we do not have maps for this place.
        </div>
      </div>
    );
  }

  return (
    <div className="disaster-dashboard-map-section">
      <div className="zoom-button-section">
        <div id={ZOOM_IN_BUTTON_ID} className="zoom-button">
          <i className="material-icons">add</i>
        </div>
        <div id={ZOOM_OUT_BUTTON_ID} className="zoom-button">
          <i className="material-icons">remove</i>
        </div>
      </div>
      <div id={MAP_ID} ref={svgContainer}></div>
      {props.selectedDisaster === DisasterType.ALL ? (
        <div className="all-disasters-legend">
          {Object.keys(DISASTER_COLORS).map((disasterType) => {
            return (
              <div className="all-disasters-legend-entry" key={disasterType}>
                <div
                  className="all-disasters-legend-color"
                  style={{ backgroundColor: DISASTER_COLORS[disasterType] }}
                ></div>
                <span>{disasterType}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div id={LEGEND_CONTAINER_ID}></div>
      )}
      <div id="disaster-dashboard-info-card" ref={infoCardRef} />
    </div>
  );

  function draw(): void {
    const width = svgContainer.current.offsetWidth;
    const height = (width * 2) / 5;
    const zoomParams = {
      zoomInButtonId: ZOOM_IN_BUTTON_ID,
      zoomOutButtonId: ZOOM_OUT_BUTTON_ID,
    };
    document.getElementById(MAP_ID).innerHTML = "";
    const isUsaPlace = isChildPlaceOf(
      props.selectedPlaceInfo.selectedPlace.dcid,
      USA_PLACE_DCID,
      props.selectedPlaceInfo.parentPlaces
    );
    const projection = getProjection(isUsaPlace, "", width, height);
    const canClickRegionCb = (placeDcid: string) => {
      const newPlace = {
        dcid: placeDcid,
        name: placeDcid,
        types: [props.selectedPlaceInfo.enclosedPlaceType],
      };
      return canClickRegion(
        newPlace,
        props.selectedPlaceInfo.selectedPlace,
        props.selectedPlaceInfo.parentPlaces,
        props.fetchedEuropeanPlaces
      );
    };
    drawD3Map(
      MAP_ID,
      props.geoJson,
      height,
      width,
      {} /* dataValues: no data values to show on the base map */,
      "" /* units: no units to show */,
      null /* colorScale: no color scale since no data shown on the base map */,
      (geoDcid: GeoJsonFeatureProperties) => {
        const namedPlace = {
          name: geoDcid.name,
          dcid: geoDcid.geoDcid,
        };
        props.onPlaceUpdated(namedPlace);
      } /* redirectAction */,
      () =>
        "" /* getTooltipHtml: no tooltips to be shown on hover over a map region */,
      canClickRegionCb,
      false /* shouldGenerateLegend: no legend needs to be generated since no data for base map */,
      true /* shouldShowBoundaryLines */,
      projection,
      props.selectedPlaceInfo.selectedPlace.dcid,
      "" /* zoomDcid: no dcid to zoom in on */,
      zoomParams
    );
    const pointValues = {};
    props.disasterEventPoints.forEach((eventPoint) => {
      if (props.selectedIntensityProp in eventPoint.intensity) {
        pointValues[eventPoint.placeDcid] =
          eventPoint.intensity[props.selectedIntensityProp];
      }
    });
    const pointsLayer = addMapPoints(
      MAP_ID,
      props.disasterEventPoints,
      pointValues,
      projection,
      (point: DisasterEventPoint) => {
        return DISASTER_COLORS[point.disasterType];
      }
    );
    pointsLayer
      .on("click", (point: DisasterEventPoint) =>
        onPointClicked(
          infoCardRef.current,
          svgContainer.current,
          point,
          d3.event
        )
      )
      .on("blur", () => {
        d3.select(infoCardRef.current).style("visibility", "hidden");
      });
  }
}
