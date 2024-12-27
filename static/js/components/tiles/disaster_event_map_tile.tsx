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
import React, { memo, useContext, useEffect, useRef, useState } from "react";

import {
  addMapPoints,
  addPathLayer,
  addPolygonLayer,
  drawD3Map,
  getProjection,
  MapZoomParams,
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
import { NamedPlace, NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { isChildPlaceOf } from "../../tools/shared_util";
import {
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
import { getParentPlacesPromise } from "../../utils/place_utils";
import { fetchGeoJsonData } from "../../utils/subject_page_utils";
import { ReplacementStrings } from "../../utils/tile_utils";
import { DataFetchContext } from "../subject_page/data_fetch_context";
import { ChartTileContainer } from "./chart_tile";
import { MapLayerData } from "./map_tile";

const ZOOM_IN_BUTTON_ID = "zoom-in-button";
const ZOOM_OUT_BUTTON_ID = "zoom-out-button";
const CSS_SELECTOR_PREFIX = "disaster-event-map";
// TODO: make this config driven
const REDIRECT_URL_PREFIX = "/disasters/";
const MAP_POINTS_MIN_RADIUS = 1.5;
const MAP_POINTS_MIN_RADIUS_EARTH = 0.8;
// Set of dcids of places that should use the selected place as the base geojson
const PLACE_MAP_PLACES = new Set(["country/AUS", "country/BRA"]);
// Map of place type to the geojson prop to use for that place type
const PLACE_TYPE_GEOJSON_PROP = {
  City: "geoJsonCoordinates",
  Country: "geoJsonCoordinatesDP3",
  State: "geoJsonCoordinatesDP3",
  AdministrativeArea1: "geoJsonCoordinatesDP3",
  County: "geoJsonCoordinatesDP1",
  AdministrativeArea2: "geoJsonCoordinatesDP1",
  AdministrativeArea3: "geoJsonCoordinatesDP1",
  EurostatNUTS1: "geoJsonCoordinatesDP2",
  EurostatNUTS2: "geoJsonCoordinatesDP2",
  EurostatNUTS3: "geoJsonCoordinatesDP1",
};
const EXPLORE_MORE_BASE_URL = "/disasters/";

export interface DisasterEventMapTilePropType {
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
  // List of parent places
  parentPlaces?: NamedPlace[];
  // API root
  apiRoot?: string;
  // Whether or not to show the explore more button.
  showExploreMore?: boolean;
}

export interface DisasterMapChartData {
  // Geojson data for the base map
  baseMapGeoJson: GeoJsonData;
  // Whether the base map is a map of just the current place. If false, the base
  // map is made up of chidlren places.
  isPlaceBaseMap: boolean;
  // Geojson data for each polygon event type
  polygonGeoJson: Record<string, GeoJsonData>;
  // Geojson data for each path event type
  pathGeoJson: Record<string, GeoJsonData>;
  // List of parent places
  parentPlaces: NamedPlace[];
  // DisasterEventPointData to draw
  disasterEventData: Record<string, DisasterEventPointData>;
  // Set of sources used to get the data in the chart
  sources: Set<string>;
}

export const DisasterEventMapTile = memo(function DisasterEventMapTile(
  props: DisasterEventMapTilePropType
): JSX.Element {
  const svgContainerRef = useRef(null);
  const infoCardRef = useRef(null);
  const [chartData, setChartData] = useState<DisasterMapChartData>(null);
  const [selectedEventTypes, setSelectedEventTypes] = useState(
    new Set(Object.keys(props.eventTypeSpec))
  );
  const [svgHeight, setSvgHeight] = useState(null);
  const { fetchData } = useContext(DataFetchContext);
  const isInitialLoading =
    _.isNull(chartData) || _.isNull(props.disasterEventData);
  const shouldShowMap =
    !isInitialLoading &&
    !_.isEmpty(chartData.baseMapGeoJson) &&
    !_.isEmpty(chartData.baseMapGeoJson.features);
  const zoomParams = {
    zoomInButtonId: `${ZOOM_IN_BUTTON_ID}-${props.id}`,
    zoomOutButtonId: `${ZOOM_OUT_BUTTON_ID}-${props.id}`,
  };
  useEffect(() => {
    if (_.isNull(props.disasterEventData)) {
      return;
    }
    fetchChartData(props, fetchData).then((chartData) => {
      setChartData(chartData);
    });
  }, [props]);

  useEffect(() => {
    if (shouldShowMap) {
      draw(
        props,
        chartData,
        svgContainerRef.current,
        selectedEventTypes,
        svgHeight,
        svgContainerRef.current.offsetWidth,
        zoomParams,
        infoCardRef.current,
        (geoFeature: GeoJsonFeatureProperties) =>
          redirectAction(geoFeature.geoDcid)
      );
    }
  }, [
    chartData,
    props.disasterEventData,
    selectedEventTypes,
    svgContainerRef,
    infoCardRef,
  ]);

  useEffect(() => {
    // Set svg height when props change
    setSvgHeight(getSvgHeight());
  }, [props]);

  return (
    <ChartTileContainer
      id={props.id}
      title={props.title}
      apiRoot={props.apiRoot}
      sources={chartData ? chartData.sources : new Set<string>()}
      replacementStrings={getReplacementStrings(props)}
      className={`${CSS_SELECTOR_PREFIX}-tile`}
      allowEmbed={false}
      isInitialLoading={isInitialLoading}
      exploreLink={
        props.showExploreMore
          ? {
              displayText: "Disaster Tool",
              url: `${EXPLORE_MORE_BASE_URL}${props.place.dcid}`,
            }
          : null
      }
    >
      <div className={`${CSS_SELECTOR_PREFIX}-container`}>
        <div className={`${CSS_SELECTOR_PREFIX}-chart-section`}>
          {shouldShowMap && (
            <div className={`${CSS_SELECTOR_PREFIX}-zoom-button-section`}>
              <div
                id={zoomParams.zoomInButtonId}
                className={`${CSS_SELECTOR_PREFIX}-zoom-button`}
              >
                <i className="material-icons">add</i>
              </div>
              <div
                id={zoomParams.zoomOutButtonId}
                className={`${CSS_SELECTOR_PREFIX}-zoom-button`}
              >
                <i className="material-icons">remove</i>
              </div>
            </div>
          )}
          <div
            id={props.id}
            className={`svg-container`}
            ref={svgContainerRef}
            style={{ minHeight: svgHeight }}
          >
            {!shouldShowMap && !isInitialLoading && (
              <div className={`${CSS_SELECTOR_PREFIX}-error-message`}>
                Sorry, we do not have maps for this place.
              </div>
            )}
          </div>
          <div className={`${CSS_SELECTOR_PREFIX}-controls`}>
            <div className={`${CSS_SELECTOR_PREFIX}-legend`}>
              {shouldShowMap &&
                Object.values(props.eventTypeSpec).map((spec) => {
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
      </div>
    </ChartTileContainer>
  );

  /**
   * Calculate what the height of the svg section should be.
   */
  function getSvgHeight(): number {
    if (svgContainerRef.current) {
      const width = svgContainerRef.current.offsetWidth;
      const height = Math.max(
        svgContainerRef.current.offsetHeight,
        Math.ceil((width * 2) / 5)
      );
      return height;
    }
    return svgHeight;
  }

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
   * Handles redirecting to the disaster page for a different placeDcid
   */
  function redirectAction(placeDcid: string): void {
    window.open(`${REDIRECT_URL_PREFIX}${placeDcid}`, "_self");
  }
});

/**
 * Gets whether the geojson for the selected place should be used for the base
 * map
 */
function shouldUsePlaceGeoJson(
  placeDcid: string,
  childrenGeoJson: GeoJsonData
): boolean {
  if (PLACE_MAP_PLACES.has(placeDcid)) {
    return true;
  }
  // Should use place geojson if children geojson are not available.
  return _.isEmpty(childrenGeoJson) || _.isEmpty(childrenGeoJson.features);
}

/**
 * Fetches and sets the geojson for a list of event types when given the key
 * to get the geojson prop from the event type spec and the key to get the
 * geojson feature from the event point
 */
function fetchEventGeoJsonData(
  props: DisasterEventMapTilePropType,
  eventTypeKeys: string[],
  eventPointGeoJsonKey: string,
  geoJsonPropKey: string,
  apiRoot?: string
): Promise<Record<string, GeoJsonData>> {
  if (_.isEmpty(eventTypeKeys)) {
    return Promise.resolve({});
  }
  const geoJsonPromises = [];
  // map of event type to list of geojson features read from event points
  const eventTypeFeatures = {};
  for (const eventType of eventTypeKeys) {
    if (!props.eventTypeSpec[eventType][geoJsonPropKey]) {
      geoJsonPromises.push(Promise.resolve(null));
      continue;
    }
    eventTypeFeatures[eventType] = [];
    // list of dcids to fetch geojson for
    const eventDcids = [];
    for (const eventPoint of props.disasterEventData[eventType].eventPoints) {
      if (eventPoint[eventPointGeoJsonKey]) {
        eventTypeFeatures[eventType].push(eventPoint[eventPointGeoJsonKey]);
      } else {
        eventDcids.push(eventPoint.placeDcid);
      }
    }
    // if at least one event type feature was read from an event point, then
    // all event points should contain geojson feature information IF its
    // available for the event point.
    const eventDcidsToFetch = _.isEmpty(eventTypeFeatures[eventType])
      ? eventDcids
      : [];
    geoJsonPromises.push(
      fetchNodeGeoJson(
        eventDcidsToFetch,
        props.eventTypeSpec[eventType][geoJsonPropKey],
        apiRoot
      )
    );
  }
  return Promise.all(geoJsonPromises)
    .then((geoJsons) => {
      const eventTypeGeoJsonData = {};
      eventTypeKeys.forEach((type, i) => {
        if (!geoJsons[i]) {
          return;
        }
        const geoJsonData = geoJsons[i];
        geoJsonData.features.push(...eventTypeFeatures[type]);
        eventTypeGeoJsonData[type] = geoJsonData;
      });
      return eventTypeGeoJsonData;
    })
    .catch(() => {
      return {};
    });
}

/**
 * Fetches the chart data for a disaster event map
 * @param props props for the disaster event map tile
 * @param fetchData function to use to fetch data with a given cache key and data promise
 */
export function fetchChartData(
  props: DisasterEventMapTilePropType,
  fetchData?: (
    cacheKey: string,
    dataPromise: () => Promise<any>
  ) => Promise<any>
): Promise<DisasterMapChartData> {
  const pathGeoJsonPromise = fetchEventGeoJsonData(
    props,
    props.tileSpec.pathEventTypeKey,
    "pathGeoJson",
    "pathGeoJsonProp",
    props.apiRoot
  );
  const polygonGeoJsonPromise = fetchEventGeoJsonData(
    props,
    props.tileSpec.polygonEventTypeKey,
    "polygonGeoJson",
    "polygonGeoJsonProp",
    props.apiRoot
  );
  const childGeoJsonPromiseFn = (): Promise<GeoJsonData> =>
    fetchGeoJsonData(
      props.place,
      props.enclosedPlaceType,
      props.parentPlaces,
      props.apiRoot
    );
  const childrenGeoJsonPromise = fetchData
    ? fetchData(
        `childGeoJson-${props.place.dcid}-${props.enclosedPlaceType}`,
        childGeoJsonPromiseFn
      )
    : childGeoJsonPromiseFn();
  let placeGeoJsonProp = "";
  for (const type of props.place.types) {
    if (type in PLACE_TYPE_GEOJSON_PROP) {
      placeGeoJsonProp = PLACE_TYPE_GEOJSON_PROP[type];
      break;
    }
  }
  const placeGeoJsonPromiseFn = (): Promise<GeoJsonData> =>
    fetchNodeGeoJson([props.place.dcid], placeGeoJsonProp, props.apiRoot);
  const placeGeoJsonPromise = fetchData
    ? fetchData(
        `placeGeoJson-${props.place.dcid}-${placeGeoJsonProp}`,
        placeGeoJsonPromiseFn
      )
    : placeGeoJsonPromiseFn();
  let parentPlacesPromise =
    props.parentPlaces !== undefined
      ? Promise.resolve(props.parentPlaces)
      : null;
  if (!parentPlacesPromise) {
    const parentPlacesPromiseFn = (): Promise<Array<NamedTypedPlace>> =>
      getParentPlacesPromise(props.place.dcid, props.apiRoot);
    parentPlacesPromise = fetchData
      ? fetchData(`parents-${props.place.dcid}`, parentPlacesPromiseFn)
      : parentPlacesPromiseFn();
  }
  return Promise.all([
    pathGeoJsonPromise,
    polygonGeoJsonPromise,
    childrenGeoJsonPromise,
    placeGeoJsonPromise,
    parentPlacesPromise,
  ]).then(
    ([
      pathGeoJson,
      polygonGeoJson,
      childrenGeoJson,
      placeGeoJson,
      parentPlaces,
    ]) => {
      const isPlaceBaseMap = shouldUsePlaceGeoJson(
        props.place.dcid,
        childrenGeoJson
      );

      const sources = new Set<string>();
      Object.values(props.disasterEventData).forEach((eventData) => {
        Object.values(eventData.provenanceInfo).forEach((provInfo) => {
          sources.add(provInfo.provenanceUrl);
        });
      });
      return {
        pathGeoJson,
        polygonGeoJson,
        parentPlaces,
        baseMapGeoJson: isPlaceBaseMap ? placeGeoJson : childrenGeoJson,
        isPlaceBaseMap,
        disasterEventData: props.disasterEventData,
        sources,
      };
    }
  );
}

/**
 * Draws the disaster event map
 */
export function draw(
  props: DisasterEventMapTilePropType,
  chartData: DisasterMapChartData,
  svgContainer: HTMLDivElement,
  selectedEventTypes: Set<string>,
  svgHeight: number,
  svgWidth: number,
  zoomParams?: MapZoomParams,
  infoCard?: HTMLDivElement,
  redirectAction?: (geoFeature: GeoJsonFeatureProperties) => void
): void {
  const isUsaPlace = isChildPlaceOf(
    props.place.dcid,
    USA_PLACE_DCID,
    chartData.parentPlaces
  );
  const projection = getProjection(
    isUsaPlace,
    props.place.dcid,
    svgWidth,
    svgHeight,
    chartData.baseMapGeoJson,
    props.place.dcid
  );
  const layerData: MapLayerData = {
    colorScale: null /* no color scale since no data shown on the base map */,
    dataValues: {} /* no data values to show on the base map */,
    geoJson: chartData.baseMapGeoJson,
  };
  drawD3Map(
    svgContainer,
    [layerData],
    svgHeight,
    svgWidth,
    redirectAction || _.noop /* redirectAction */,
    (place: NamedPlace) => place.name || place.dcid /* getTooltipHtml */,
    (placeDcid: string) =>
      placeDcid !==
      props.place
        .dcid /* canClickRegion: don't allow clicking region that will redirect to current page */,
    projection,
    chartData.isPlaceBaseMap
      ? ""
      : props.place
          .dcid /** zoomDcid: don't want special zoom handling of the selected place if using place base map */,
    zoomParams,
    { strokeColor: "#ccc", noDataFill: "#fff" }
  );
  // map of disaster event point id to the disaster event point
  const pointsMap = {};
  Object.values(chartData.disasterEventData).forEach((data) => {
    data.eventPoints.forEach((point) => {
      pointsMap[point.placeDcid] = point;
    });
  });
  for (const eventType of props.tileSpec.polygonEventTypeKey || []) {
    if (
      !(eventType in chartData.polygonGeoJson) ||
      !selectedEventTypes.has(eventType)
    ) {
      continue;
    }
    addPolygonLayer(
      svgContainer,
      chartData.polygonGeoJson[eventType],
      projection,
      () => props.eventTypeSpec[eventType].color,
      () => "none",
      (geoFeature: GeoJsonFeature) => {
        if (infoCard) {
          onPointClicked(
            infoCard,
            svgContainer,
            pointsMap[geoFeature.properties.geoDcid],
            d3.event
          );
        }
      }
    );
  }
  for (const eventType of props.tileSpec.pathEventTypeKey || []) {
    if (
      !(eventType in chartData.pathGeoJson) ||
      !selectedEventTypes.has(eventType)
    ) {
      continue;
    }
    addPathLayer(
      svgContainer,
      chartData.pathGeoJson[eventType],
      projection,
      () => props.eventTypeSpec[eventType].color,
      (geoFeature: GeoJsonFeature) => {
        if (infoCard) {
          onPointClicked(
            infoCard,
            svgContainer,
            pointsMap[geoFeature.properties.geoDcid],
            d3.event
          );
        }
      }
    );
  }
  for (const eventType of props.tileSpec.pointEventTypeKey || []) {
    if (!selectedEventTypes.has(eventType)) {
      continue;
    }
    const mapPointsData = getMapPointsData(
      chartData.disasterEventData[eventType].eventPoints,
      props.eventTypeSpec[eventType]
    );
    const pointsLayer = addMapPoints(
      svgContainer,
      mapPointsData.points,
      mapPointsData.values,
      projection,
      (point: DisasterEventPoint) => {
        return props.eventTypeSpec[point.disasterType].color;
      },
      undefined,
      props.place.dcid == EARTH_NAMED_TYPED_PLACE.dcid
        ? MAP_POINTS_MIN_RADIUS_EARTH
        : MAP_POINTS_MIN_RADIUS
    );
    pointsLayer.on("click", (point: DisasterEventPoint) => {
      if (infoCard) {
        onPointClicked(infoCard, svgContainer, point, d3.event);
      }
    });
  }
}

// Get the ReplacementStrings object used for formatting the title
export function getReplacementStrings(
  props: DisasterEventMapTilePropType
): ReplacementStrings {
  return {
    placeName: props.place.name,
  };
}
