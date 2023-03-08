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
import React, { useContext, useEffect, useRef, useState } from "react";

import {
  addMapPoints,
  addPathLayer,
  addPolygonLayer,
  drawD3Map,
  getProjection,
} from "../../chart/draw_d3_map";
import {
  GeoJsonData,
  GeoJsonFeature,
  GeoJsonFeatureProperties,
} from "../../chart/types";
import {
  EARTH_NAMED_TYPED_PLACE,
  USA_PLACE_DCID,
} from "../../shared/constants";
import { NamedPlace, NamedTypedPlace } from "../../shared/types";
import { isChildPlaceOf } from "../../tools/shared_util";
import {
  DisasterEventMapPlaceInfo,
  DisasterEventPoint,
  DisasterEventPointData,
} from "../../types/disaster_event_map_types";
import {
  DisasterEventMapTileSpec,
  EventTypeSpec,
} from "../../types/subject_page_proto_types";
import {
  getMapPointsData,
  onPointClicked,
} from "../../utils/disaster_event_map_utils";
import { fetchNodeGeoJson } from "../../utils/geojson_utils";
import {
  getParentPlacesPromise,
} from "../../utils/place_utils";
import { ReplacementStrings } from "../../utils/tile_utils";
import { DataContext } from "../subject_page/data_context";
import { ChartTileContainer } from "./chart_tile";

const ZOOM_IN_BUTTON_ID = "zoom-in-button";
const ZOOM_OUT_BUTTON_ID = "zoom-out-button";
const CSS_SELECTOR_PREFIX = "disaster-event-map";
// TODO: make this config driven
const REDIRECT_URL_PREFIX = "/disasters/";
const MAP_POINTS_MIN_RADIUS = 1.5;
const MAP_POINTS_MIN_RADIUS_EARTH = 0.8;
// Set of dcids of places that should use the selected place as the base geojson
const PLACE_MAP_PLACES = new Set(["country/AUS", "country/BRA"]);

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
  // DisasterEventPointData to use for this tile
  disasterEventData: Record<string, DisasterEventPointData>;
  // Tile spec with information about what to show on this map
  tileSpec: DisasterEventMapTileSpec;
}

export function DisasterEventMapTile(
  props: DisasterEventMapTilePropType
): JSX.Element {
  const svgContainerRef = useRef(null);
  const infoCardRef = useRef(null);
  const [placeInfo, setPlaceInfo] = useState<DisasterEventMapPlaceInfo>(null);
  const { geoJsonData } = useContext(DataContext);
  const [polygonGeoJson, setPolygonGeoJson] = useState(null);
  const [pathGeoJson, setPathGeoJson] = useState(null);
  const [selectedEventTypes, setSelectedEventTypes] = useState(
    new Set(Object.keys(props.eventTypeSpec))
  );
  let baseMapGeoJson = null;
  if (geoJsonData) {
    baseMapGeoJson = shouldUsePlaceGeoJson()
      ? geoJsonData.placeGeoJson
      : geoJsonData.childrenGeoJson;
  }
  const shouldShowMap =
    placeInfo &&
    !_.isEmpty(baseMapGeoJson) &&
    !_.isEmpty(baseMapGeoJson.features) &&
    !_.isNull(polygonGeoJson) &&
    !_.isNull(pathGeoJson);

  useEffect(() => {
    // re-fetch event geojson data for paths and polygons when disaster event
    // data changes or tile spec changes
    fetchEventGeoJsonData(
      props.tileSpec.pathEventTypeKey,
      "pathGeoJsonProp",
      setPathGeoJson
    );
    fetchEventGeoJsonData(
      props.tileSpec.polygonEventTypeKey,
      "polygonGeoJsonProp",
      setPolygonGeoJson
    );
  }, [
    props.disasterEventData,
    props.tileSpec,
    setPathGeoJson,
    setPolygonGeoJson,
  ]);

  useEffect(() => {
    // When props change, update place info
    updatePlaceInfo(props.place, props.enclosedPlaceType);
  }, [props]);

  useEffect(() => {
    if (shouldShowMap) {
      draw(
        placeInfo,
        baseMapGeoJson,
        props.disasterEventData,
        polygonGeoJson,
        pathGeoJson
      );
    }
  }, [
    placeInfo,
    baseMapGeoJson,
    props.disasterEventData,
    polygonGeoJson,
    pathGeoJson,
    selectedEventTypes,
  ]);

  if (geoJsonData == null || !placeInfo) {
    return null;
  }

  const rs: ReplacementStrings = {
    place: props.place.name,
    date: "",
  };

  const sources = new Set<string>();
  Object.values(props.disasterEventData).forEach((eventData) => {
    Object.values(eventData.provenanceInfo).forEach((provInfo) => {
      sources.add(provInfo.provenanceUrl);
    });
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
        {!shouldShowMap ? (
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
                        onClick={() => toggleEventTypeSelection(spec.id)}
                      >
                        <div
                          className={`${CSS_SELECTOR_PREFIX}-legend-color`}
                          style={{
                            backgroundColor: selectedEventTypes.has(spec.id)
                              ? spec.color
                              : "transparent",
                            borderColor: spec.color,
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
   * Updates selectedEventTypes state for when an eventType is toggled
   */
  function toggleEventTypeSelection(eventType: string): void {
    const newSelectedEventTypes = _.cloneDeep(selectedEventTypes);
    if (selectedEventTypes.has(eventType)) {
      newSelectedEventTypes.delete(eventType);
    } else {
      newSelectedEventTypes.add(eventType);
    }
    setSelectedEventTypes(newSelectedEventTypes);
  }

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
   * Fetches and sets the geojson for a list of event types and the key to use
   * for getting the geojson prop.
   */
  function fetchEventGeoJsonData(
    eventTypeKeys: string[],
    geoJsonPropKey: string,
    setEventTypeGeoJson: (eventTypeGeoJson: Record<string, GeoJsonData>) => void
  ): void {
    if (_.isEmpty(eventTypeKeys)) {
      setEventTypeGeoJson({});
      return;
    }
    const geoJsonPromises = eventTypeKeys.map((eventType) => {
      if (
        props.disasterEventData[eventType] &&
        geoJsonPropKey in props.eventTypeSpec[eventType]
      ) {
        const eventDcids = props.disasterEventData[eventType].eventPoints.map(
          (point) => point.placeDcid
        );
        return fetchNodeGeoJson(
          eventDcids,
          props.eventTypeSpec[eventType][geoJsonPropKey]
        );
      }
    });
    Promise.all(geoJsonPromises)
      .then((geoJsons) => {
        const eventTypeGeoJsonData = {};
        eventTypeKeys.forEach((type, i) => {
          if (!geoJsons[i]) {
            return;
          }
          eventTypeGeoJsonData[type] = geoJsons[i];
        });
        setEventTypeGeoJson(eventTypeGeoJsonData);
      })
      .catch(() => {
        setEventTypeGeoJson({});
      });
  }

  /**
   * Draws the disaster event map
   */
  function draw(
    placeInfo: DisasterEventMapPlaceInfo,
    geoJsonData: GeoJsonData,
    disasterEventData: Record<string, DisasterEventPointData>,
    polygonGeoJson: GeoJsonData,
    pathGeoJson: GeoJsonData
  ): void {
    const width = svgContainerRef.current.offsetWidth;
    const height = Math.max(
      svgContainerRef.current.offsetHeight,
      (width * 2) / 5
    );
    const zoomParams = {
      zoomInButtonId: ZOOM_IN_BUTTON_ID,
      zoomOutButtonId: ZOOM_OUT_BUTTON_ID,
    };
    const isUsaPlace = isChildPlaceOf(
      placeInfo.selectedPlace.dcid,
      USA_PLACE_DCID,
      placeInfo.parentPlaces
    );
    const isPlaceBaseMap = shouldUsePlaceGeoJson();
    const projection = getProjection(
      isUsaPlace,
      placeInfo.selectedPlace.dcid,
      width,
      height,
      geoJsonData,
      placeInfo.selectedPlace.dcid
    );
    drawD3Map(
      svgContainerRef.current,
      geoJsonData,
      height,
      width,
      {} /* dataValues: no data values to show on the base map */,
      null /* colorScale: no color scale since no data shown on the base map */,
      (geoFeature: GeoJsonFeatureProperties) =>
        redirectAction(geoFeature.geoDcid) /* redirectAction */,
      (place: NamedPlace) => place.name || place.dcid /* getTooltipHtml */,
      (placeDcid: string) =>
        placeDcid !==
        placeInfo.selectedPlace
          .dcid /* canClickRegion: don't allow clicking region that will redirect to current page */,
      true /* shouldShowBoundaryLines */,
      projection,
      isPlaceBaseMap
        ? ""
        : placeInfo.selectedPlace
            .dcid /** zoomDcid: don't want special zoom handling of the selected place if usiing place base map */,
      zoomParams
    );
    // map of disaster event point id to the disaster event point
    const pointsMap = {};
    Object.values(disasterEventData).forEach((data) => {
      data.eventPoints.forEach((point) => {
        pointsMap[point.placeDcid] = point;
      });
    });
    for (const eventType of props.tileSpec.polygonEventTypeKey || []) {
      if (
        !(eventType in polygonGeoJson) ||
        !selectedEventTypes.has(eventType)
      ) {
        continue;
      }
      addPolygonLayer(
        svgContainerRef.current,
        polygonGeoJson[eventType],
        projection,
        () => props.eventTypeSpec[eventType].color,
        (geoFeature: GeoJsonFeature) =>
          onPointClicked(
            infoCardRef.current,
            svgContainerRef.current,
            pointsMap[geoFeature.properties.geoDcid],
            d3.event
          )
      );
    }
    for (const eventType of props.tileSpec.pathEventTypeKey || []) {
      if (!(eventType in pathGeoJson) || !selectedEventTypes.has(eventType)) {
        continue;
      }
      addPathLayer(
        svgContainerRef.current,
        pathGeoJson[eventType],
        projection,
        () => props.eventTypeSpec[eventType].color,
        (geoFeature: GeoJsonFeature) =>
          onPointClicked(
            infoCardRef.current,
            svgContainerRef.current,
            pointsMap[geoFeature.properties.geoDcid],
            d3.event
          )
      );
    }
    for (const eventType of props.tileSpec.pointEventTypeKey || []) {
      if (!selectedEventTypes.has(eventType)) {
        continue;
      }
      const mapPointsData = getMapPointsData(
        disasterEventData[eventType].eventPoints,
        props.eventTypeSpec[eventType]
      );
      const pointsLayer = addMapPoints(
        svgContainerRef.current,
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

  // Gets whether the geojson for the selected place should be used for the base
  // map.
  function shouldUsePlaceGeoJson(): boolean {
    if (!geoJsonData) {
      // When geojson data hasn't been fetched yet, default to not using place
      // geojson.
      return false;
    }
    if (PLACE_MAP_PLACES.has(props.place.dcid)) {
      return true;
    }
    // Should use place geojson if children geojson are not available.
    return (
      _.isEmpty(geoJsonData.childrenGeoJson) ||
      _.isEmpty(geoJsonData.childrenGeoJson.features)
    );
  }
}
