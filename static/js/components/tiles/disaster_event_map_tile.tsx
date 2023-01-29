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
 * Component for rendering a disaster event map type tile.
 */

import * as d3 from "d3";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import {
  addMapPoints,
  drawD3Map,
  getProjection,
} from "../../chart/draw_d3_map";
import { GeoJsonData, GeoJsonFeatureProperties } from "../../chart/types";
import {
  EARTH_NAMED_TYPED_PLACE,
  EUROPE_NAMED_TYPED_PLACE,
  USA_PLACE_DCID,
} from "../../shared/constants";
import { NamedPlace, NamedTypedPlace } from "../../shared/types";
import { isChildPlaceOf } from "../../tools/shared_util";
import {
  DisasterEventMapPlaceInfo,
  DisasterEventPoint,
  DisasterEventPointData,
} from "../../types/disaster_event_map_types";
import { EventTypeSpec } from "../../types/subject_page_proto_types";
import {
  fetchGeoJsonData,
  getMapPointsData,
  onPointClicked,
} from "../../utils/disaster_event_map_utils";
import {
  getEnclosedPlacesPromise,
  getParentPlacesPromise,
} from "../../utils/place_utils";
import { ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";

const ZOOM_IN_BUTTON_ID = "zoom-in-button";
const ZOOM_OUT_BUTTON_ID = "zoom-out-button";
const CSS_SELECTOR_PREFIX = "disaster-event-map";
// TODO: make this config driven
const REDIRECT_URL_PREFIX = "/disasters/";
const MAP_POINTS_MIN_RADIUS = 1.5;
const MAP_POINTS_MIN_RADIUS_EARTH = 0.8;

interface DisasterEventMapTilePropType {
  // Id for this tile
  id: string;
  // Title for this tile
  title: string;
  // Place to show the event map for
  place: NamedTypedPlace;
  // Place type to show the event map for
  enclosedPlaceType: string;
  // Map of eventType id to EventTypeSpec
  eventTypeSpec: Record<string, EventTypeSpec>;
  // disaster event data to show on the event map
  disasterEventData: DisasterEventPointData;
}

export function DisasterEventMapTile(
  props: DisasterEventMapTilePropType
): JSX.Element {
  const svgContainerRef = useRef(null);
  const infoCardRef = useRef(null);
  const europeanPlaces = useRef([]);
  const prevDisasterEventData = useRef(null);
  const [placeInfo, setPlaceInfo] = useState<DisasterEventMapPlaceInfo>(null);
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonData>(null);

  useEffect(() => {
    // On initial loading of the component, get list of all European countries
    // and save it in a ref to be used for map drawing.
    getEnclosedPlacesPromise(EUROPE_NAMED_TYPED_PLACE.dcid, "Country").then(
      (resp: Array<NamedPlace>) => {
        europeanPlaces.current = resp;
      }
    );
  }, []);

  useEffect(() => {
    // When props change, update place info
    updatePlaceInfo(props.place, props.enclosedPlaceType);
  }, [props]);

  useEffect(() => {
    // re-fetch geojson data when placeInfo changes
    if (
      !placeInfo ||
      (!_.isEmpty(geoJsonData) &&
        geoJsonData.properties.current_geo === placeInfo.selectedPlace.dcid)
    ) {
      return;
    }
    fetchGeoJsonData(placeInfo).then((geoJsonData) => {
      setGeoJsonData(geoJsonData);
    });
  }, [placeInfo]);

  useEffect(() => {
    // re-draw map if placeInfo, geoJson, or disasterEventData changes
    if (
      !_.isEmpty(geoJsonData) &&
      !_.isEqual(props.disasterEventData, prevDisasterEventData.current)
    ) {
      prevDisasterEventData.current = props.disasterEventData;
      draw(placeInfo, geoJsonData, props.disasterEventData);
    }
  }, [placeInfo, geoJsonData, props.disasterEventData]);

  if (geoJsonData == null) {
    return null;
  }

  const rs: ReplacementStrings = {
    place: props.place.name,
    date: "",
  };

  const sources = new Set<string>();
  Object.values(props.disasterEventData.provenanceInfo).forEach((provInfo) => {
    sources.add(provInfo.provenanceUrl);
  });

  return (
    <ChartTileContainer
      title={props.title}
      sources={sources}
      replacementStrings={rs}
      className={`${CSS_SELECTOR_PREFIX}-tile`}
      allowEmbed={false}
    >
      <div className={`${CSS_SELECTOR_PREFIX}-container`}>
        {_.isEmpty(geoJsonData.features) ? (
          <div className={`${CSS_SELECTOR_PREFIX}-error-message`}>
            Sorry, we do not have maps for this place.
          </div>
        ) : (
          <>
            <div className={`${CSS_SELECTOR_PREFIX}-chart-section`}>
              <div className={`${CSS_SELECTOR_PREFIX}-zoom-button-section`}>
                <div
                  id={ZOOM_IN_BUTTON_ID}
                  className={`${CSS_SELECTOR_PREFIX}-zoom-button`}
                >
                  <i className="material-icons">add</i>
                </div>
                <div
                  id={ZOOM_OUT_BUTTON_ID}
                  className={`${CSS_SELECTOR_PREFIX}-zoom-button`}
                >
                  <i className="material-icons">remove</i>
                </div>
              </div>
              <div
                id={props.id}
                className="svg-container"
                ref={svgContainerRef}
              ></div>
              <div className={`${CSS_SELECTOR_PREFIX}-controls`}>
                <div className={`${CSS_SELECTOR_PREFIX}-legend`}>
                  {Object.values(props.eventTypeSpec).map((spec) => {
                    return (
                      <div
                        className={`${CSS_SELECTOR_PREFIX}-legend-entry`}
                        key={`${props.id}-legend-${spec.id}`}
                      >
                        <div
                          className={`${CSS_SELECTOR_PREFIX}-legend-color`}
                          style={{
                            backgroundColor: spec.color,
                          }}
                        ></div>
                        <span>{spec.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div id={`${CSS_SELECTOR_PREFIX}-info-card`} ref={infoCardRef} />
            </div>
          </>
        )}
      </div>
    </ChartTileContainer>
  );

  /**
   * Updates place info given a selectedPlace and enclosedPlaceType
   */
  function updatePlaceInfo(
    selectedPlace: NamedTypedPlace,
    enclosedPlaceType: string
  ): void {
    if (placeInfo && selectedPlace.dcid === placeInfo.selectedPlace.dcid) {
      return;
    }
    getParentPlacesPromise(selectedPlace.dcid).then((parentPlaces) => {
      setPlaceInfo({
        selectedPlace,
        enclosedPlaceType,
        parentPlaces,
      });
    });
  }

  /**
   * Draws the disaster event map
   */
  function draw(
    placeInfo: DisasterEventMapPlaceInfo,
    geoJsonData: GeoJsonData,
    disasterEventData: DisasterEventPointData
  ): void {
    const width = svgContainerRef.current.offsetWidth;
    const height = (width * 2) / 5;
    const zoomParams = {
      zoomInButtonId: ZOOM_IN_BUTTON_ID,
      zoomOutButtonId: ZOOM_OUT_BUTTON_ID,
    };
    document.getElementById(props.id).innerHTML = "";
    const isUsaPlace = isChildPlaceOf(
      placeInfo.selectedPlace.dcid,
      USA_PLACE_DCID,
      placeInfo.parentPlaces
    );
    const projection = getProjection(
      isUsaPlace,
      placeInfo.selectedPlace.dcid,
      width,
      height
    );
    drawD3Map(
      props.id,
      geoJsonData,
      height,
      width,
      {} /* dataValues: no data values to show on the base map */,
      "" /* units: no units to show */,
      null /* colorScale: no color scale since no data shown on the base map */,
      (geoDcid: GeoJsonFeatureProperties) =>
        redirectAction(geoDcid.geoDcid) /* redirectAction */,
      (place: NamedPlace) => place.name || place.dcid /* getTooltipHtml */,
      () => true /* canClickRegion: allow all regions to be clickable */,
      false /* shouldGenerateLegend: no legend needs to be generated since no data for base map */,
      true /* shouldShowBoundaryLines */,
      projection,
      placeInfo.selectedPlace.dcid,
      placeInfo.selectedPlace.dcid /* zoomDcid */,
      zoomParams
    );
    const allMapPointsData = getMapPointsData(
      disasterEventData.eventPoints,
      props.eventTypeSpec
    );
    for (const mapPointsData of Object.values(allMapPointsData)) {
      const pointsLayer = addMapPoints(
        props.id,
        mapPointsData.points,
        mapPointsData.values,
        projection,
        (point: DisasterEventPoint) => {
          return props.eventTypeSpec[point.disasterType].color;
        },
        undefined,
        placeInfo.selectedPlace.dcid == EARTH_NAMED_TYPED_PLACE.dcid
          ? MAP_POINTS_MIN_RADIUS_EARTH
          : MAP_POINTS_MIN_RADIUS
      );
      pointsLayer.on("click", (point: DisasterEventPoint) =>
        onPointClicked(
          infoCardRef.current,
          svgContainerRef.current,
          point,
          d3.event
        )
      );
    }
  }

  /**
   * Handles redirecting to the disaster page for a different placeDcid
   */
  function redirectAction(placeDcid: string): void {
    window.open(`${REDIRECT_URL_PREFIX}${placeDcid}`, "_self");
  }
}
