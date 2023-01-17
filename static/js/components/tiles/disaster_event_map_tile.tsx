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
  DATE_OPTION_6M_KEY,
  DATE_OPTION_30D_KEY,
} from "../../constants/disaster_event_map_constants";
import {
  EUROPE_NAMED_TYPED_PLACE,
  USA_PLACE_DCID,
} from "../../shared/constants";
import { NamedPlace, NamedTypedPlace } from "../../shared/types";
import { loadSpinner, removeSpinner } from "../../shared/util";
import { isChildPlaceOf } from "../../tools/shared_util";
import {
  DisasterEventMapPlaceInfo,
  DisasterEventPoint,
} from "../../types/disaster_event_map_types";
import { EventTypeSpec } from "../../types/subject_page_proto_types";
import {
  fetchDateList,
  fetchDisasterEventPoints,
  fetchGeoJsonData,
  getDate,
  getSeverityFilters,
  onPointClicked,
} from "../../utils/disaster_event_map_utils";
import {
  getEnclosedPlacesPromise,
  getParentPlacesPromise,
} from "../../utils/place_utils";
import { getPlaceNames } from "../../utils/place_utils";
import { ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { DisasterEventMapFilters } from "./disaster_event_map_filters";
import { DisasterEventMapSelectors } from "./disaster_event_map_selectors";

const ZOOM_IN_BUTTON_ID = "zoom-in-button";
const ZOOM_OUT_BUTTON_ID = "zoom-out-button";
const CONTENT_SPINNER_ID = "content-spinner-screen";
const CSS_SELECTOR_PREFIX = "disaster-event-map";
const DATE_SUBSTRING_IDX = 10;
const BREADCRUMB_PARAM_KEY = "bc";
const PARAM_SEPARATOR = "__";
// TODO: make this config driven
const REDIRECT_URL_PREFIX = "/disasters/";

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
}

interface MapChartData {
  geoJson: GeoJsonData;
  disasterEventPoints: DisasterEventPoint[];
  sources: Set<string>;
}

export function DisasterEventMapTile(
  props: DisasterEventMapTilePropType
): JSX.Element {
  const svgContainerRef = useRef(null);
  const infoCardRef = useRef(null);
  const europeanPlaces = useRef([]);
  const dateRanges = useRef(getDateRanges());
  const [dateList, setDateList] = useState([]);
  const [placeInfo, setPlaceInfo] = useState<DisasterEventMapPlaceInfo>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<NamedPlace[]>([]);
  const [mapChartData, setMapChartData] = useState<MapChartData | undefined>(
    null
  );
  const [svgContainerHeight, setSvgContainerHeight] = useState(null);

  function handleResize(): void {
    // Update svgContainerHeight if svgContainerRef height has changed so that
    // severity filters section is the same height as the map.
    if (svgContainerRef.current) {
      const height = svgContainerRef.current.offsetHeight;
      if (height !== svgContainerHeight) {
        setSvgContainerHeight(height);
      }
    }
  }

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    // watch for hash change and re-fetch data whenever hash changes.
    if (!placeInfo) {
      return;
    }

    function handleHashChange(): void {
      loadSpinner(CONTENT_SPINNER_ID);
      fetchMapChartData(placeInfo, props.eventTypeSpec);
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [placeInfo, props.eventTypeSpec]);

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
    // When props change, update date and place info
    updateDateList(props.eventTypeSpec, props.place.dcid);
    updatePlaceInfo(props.place, props.enclosedPlaceType);
    updateBreadcrumbs(props.place);
  }, [props]);

  useEffect(() => {
    // When selectedDate, placeInfo, or severity filters change, re-fetch the map chart data.
    if (!placeInfo) {
      return;
    }
    fetchMapChartData(placeInfo, props.eventTypeSpec);
  }, [placeInfo, props.eventTypeSpec]);

  useEffect(() => {
    // When mapChartData has changed and geoJson is not empty, re-draw the map.
    if (mapChartData && !_.isEmpty(mapChartData.geoJson)) {
      const chartHeight = (svgContainerRef.current.offsetWidth * 2) / 5;
      setSvgContainerHeight(chartHeight);
      draw(mapChartData, placeInfo, chartHeight);
    }
    removeSpinner(CONTENT_SPINNER_ID);
  }, [mapChartData]);

  if (!mapChartData) {
    return null;
  }

  const rs: ReplacementStrings = {
    place: props.place.name,
    date: "",
  };

  return (
    <ChartTileContainer
      title={props.title}
      sources={mapChartData.sources}
      replacementStrings={rs}
      className={`${CSS_SELECTOR_PREFIX}-tile`}
      allowEmbed={false}
    >
      <DisasterEventMapSelectors
        breadcrumbPlaces={breadcrumbs}
        dateOptions={[DATE_OPTION_30D_KEY, DATE_OPTION_6M_KEY, ...dateList]}
        onPlaceSelected={(place: NamedPlace) => redirectAction(place.dcid)}
      />
      <div className={`${CSS_SELECTOR_PREFIX}-container`}>
        {_.isEmpty(mapChartData.geoJson) ? (
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
                <div
                  id={`${CSS_SELECTOR_PREFIX}-info-card`}
                  ref={infoCardRef}
                />
                <div id={CONTENT_SPINNER_ID}>
                  <div className="screen">
                    <div id="spinner"></div>
                  </div>
                </div>
              </div>
            </div>
            <DisasterEventMapFilters
              eventTypeSpec={props.eventTypeSpec}
              height={svgContainerHeight}
            />
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
   * Updates date info given an event type spec
   */
  function updateDateList(
    eventTypeSpec: Record<string, EventTypeSpec>,
    selectedPlace: string
  ): void {
    const eventTypeDcids = Object.values(eventTypeSpec).flatMap(
      (spec) => spec.eventTypeDcids
    );
    fetchDateList(eventTypeDcids, selectedPlace)
      .then((dateList) => {
        setDateList(dateList);
      })
      .catch(() => {
        setDateList([]);
      });
  }

  /**
   * Updates breadcrumbs using URL params and current place.
   */
  function updateBreadcrumbs(selectedPlace: NamedTypedPlace): void {
    // TODO: compute breadcrumbs from parent places instead of a URL param.
    const searchParams = new URLSearchParams(window.location.search);
    const breadcrumbParam = searchParams.get(BREADCRUMB_PARAM_KEY);
    // If no breadcrumbs passed in the param, just show current place
    if (!breadcrumbParam) {
      setBreadcrumbs([selectedPlace]);
      return;
    }
    const placeDcids = breadcrumbParam.split(PARAM_SEPARATOR);
    getPlaceNames(placeDcids)
      .then((names) => {
        const breadcrumbs = placeDcids.map((dcid) => {
          return {
            dcid,
            name: names[dcid],
          };
        });
        breadcrumbs.push(selectedPlace);
        setBreadcrumbs(breadcrumbs);
      })
      .catch(() => {
        const breadcrumbs = placeDcids.map((dcid) => {
          return {
            dcid,
            name: dcid,
          };
        });
        breadcrumbs.push(selectedPlace);
        setBreadcrumbs(breadcrumbs);
      });
  }

  /**
   * Fetches the chart data needed for drawing the map
   */
  function fetchMapChartData(
    placeInfo: DisasterEventMapPlaceInfo,
    eventTypeSpec: Record<string, EventTypeSpec>
  ): void {
    // Only re-fetch geojson data if place selection has changed
    const selectedDate = getDate();
    const severityFilters = getSeverityFilters(eventTypeSpec);
    const geoJsonPromise =
      mapChartData &&
      !_.isEmpty(mapChartData.geoJson) &&
      mapChartData.geoJson.properties.current_geo ===
        placeInfo.selectedPlace.dcid
        ? Promise.resolve(mapChartData.geoJson)
        : fetchGeoJsonData(
            placeInfo.selectedPlace.dcid,
            placeInfo.enclosedPlaceType
          );
    const dateRange: [string, string] =
      selectedDate in dateRanges.current
        ? dateRanges.current[selectedDate]
        : [selectedDate, selectedDate];
    const disasterEventDataPromise = fetchDisasterEventPoints(
      Object.values(eventTypeSpec),
      placeInfo.selectedPlace.dcid,
      dateRange,
      severityFilters
    );
    Promise.all([geoJsonPromise, disasterEventDataPromise])
      .then(([geoJson, disasterEventData]) => {
        const sources = new Set<string>();
        Object.values(disasterEventData.provenanceInfo).forEach((provInfo) => {
          sources.add(provInfo.provenanceUrl);
        });
        setMapChartData({
          geoJson,
          disasterEventPoints: disasterEventData.eventPoints,
          sources,
        });
      })
      .catch(() => {
        // TODO: add error message
        setMapChartData(null);
      });
  }

  /**
   * Draws the disaster event map
   */
  function draw(
    mapChartData: MapChartData,
    placeInfo: DisasterEventMapPlaceInfo,
    height: number
  ): void {
    const width = svgContainerRef.current.offsetWidth;
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
    const projection = getProjection(isUsaPlace, "", width, height);
    drawD3Map(
      props.id,
      mapChartData.geoJson,
      height,
      width,
      {} /* dataValues: no data values to show on the base map */,
      "" /* units: no units to show */,
      null /* colorScale: no color scale since no data shown on the base map */,
      (geoDcid: GeoJsonFeatureProperties) =>
        redirectAction(geoDcid.geoDcid) /* redirectAction */,
      () =>
        "" /* getTooltipHtml: no tooltips to be shown on hover over a map region */,
      () => true /* canClickRegion: allow all regions to be clickable */,
      false /* shouldGenerateLegend: no legend needs to be generated since no data for base map */,
      true /* shouldShowBoundaryLines */,
      projection,
      placeInfo.selectedPlace.dcid,
      "" /* zoomDcid: no dcid to zoom in on */,
      zoomParams
    );
    const pointValues = {};
    const pointsLayer = addMapPoints(
      props.id,
      mapChartData.disasterEventPoints,
      pointValues,
      projection,
      (point: DisasterEventPoint) => {
        return props.eventTypeSpec[point.disasterType].color;
      }
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

  /**
   * Gets special date ranges that are based off the current date.
   */
  function getDateRanges(): { [dateKey: string]: [string, string] } {
    const currentDate = new Date();
    const minus30Days = new Date(
      new Date().setDate(currentDate.getDate() - 30)
    );
    const minus6Months = new Date(
      new Date().setMonth(currentDate.getMonth() - 6)
    );
    return {
      [DATE_OPTION_30D_KEY]: [
        minus30Days.toISOString().substring(0, DATE_SUBSTRING_IDX),
        currentDate.toISOString().substring(0, DATE_SUBSTRING_IDX),
      ],
      [DATE_OPTION_6M_KEY]: [
        minus6Months.toISOString().substring(0, DATE_SUBSTRING_IDX),
        currentDate.toISOString().substring(0, DATE_SUBSTRING_IDX),
      ],
    };
  }

  /**
   * Handles redirecting to the disaster page for a different placeDcid
   */
  function redirectAction(placeDcid: string): void {
    const breadcrumbIdx = breadcrumbs.findIndex(
      (crumb) => crumb.dcid === placeDcid
    );
    let redirectBreadcrumbs = breadcrumbs;
    if (breadcrumbIdx > -1) {
      redirectBreadcrumbs = breadcrumbs.slice(0, breadcrumbIdx);
    }
    let breadcrumbParam = "";
    if (!_.isEmpty(redirectBreadcrumbs)) {
      const breadcrumbDcids = redirectBreadcrumbs.map((bc) => bc.dcid);
      breadcrumbParam = `?bc=${breadcrumbDcids.join(PARAM_SEPARATOR)}`;
    }
    window.open(
      `${REDIRECT_URL_PREFIX}${placeDcid}${breadcrumbParam}`,
      "_self"
    );
  }
}
