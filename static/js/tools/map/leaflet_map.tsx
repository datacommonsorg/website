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
 * Chart component for drawing a leaflet map.
 */

import geoblaze from "geoblaze";
import L from "leaflet";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import {
  addGeoJsonLayer,
  addGeotiffLayer,
  setOptimalMapView,
} from "../../chart/draw_leaflet_map";
import { generateLegendSvg, getColorScale } from "../../chart/draw_map_utils";
import { GeoJsonData } from "../../chart/types";
import { MAP_CONTAINER_ID } from "./chart";
import { DisplayOptionsWrapper, PlaceInfo, StatVarWrapper } from "./context";
import { DataPointMetadata } from "./util";

interface LeafletMapProps {
  geoJsonData: GeoJsonData;
  georaster: any;
  metadata: { [dcid: string]: DataPointMetadata };
  placeInfo: PlaceInfo;
  statVar: StatVarWrapper;
  unit: string;
  display: DisplayOptionsWrapper;
}

const LEGEND_CONTAINER_ID = "choropleth-legend";
const CHART_CONTAINER_ID = "chart-container";
const LEGEND_MARGIN_LEFT = 30;
const LEGEND_HEIGHT_SCALING = 0.6;

export function LeafletMap(props: LeafletMapProps): JSX.Element {
  const [errorMessage, setErrorMessage] = useState("");
  const chartContainerRef = useRef<HTMLDivElement>();
  const leafletMap = useRef(null);
  const geotiffLayer = useRef(null);
  const geojsonLayer = useRef(null);

  useEffect(() => {
    leafletMap.current = L.map(MAP_CONTAINER_ID, {
      center: [0, 0],
      zoom: 3,
    });
  }, []);

  // Replot when data changes.
  // TODO: handle resizing of chart area
  useEffect(() => {
    if (props.georaster) {
      plot();
    }
  }, [props]);

  if (errorMessage) {
    return <div className="error-message">{errorMessage}</div>;
  } else {
    return (
      <div className="map-section-container leaflet-map-container">
        <div id={CHART_CONTAINER_ID} ref={chartContainerRef}>
          <div id={MAP_CONTAINER_ID}></div>
          <div id={LEGEND_CONTAINER_ID}></div>
        </div>
      </div>
    );
  }

  function plot(): void {
    document.getElementById(
      LEGEND_CONTAINER_ID
    ).innerHTML = `<div id="legend-unit">${props.unit || ""}</div>`;
    const width = document.getElementById(CHART_CONTAINER_ID).offsetWidth;
    const height = (width * 2) / 5;
    const svTitle =
      props.statVar.value.dcid in props.statVar.value.info
        ? props.statVar.value.info[props.statVar.value.dcid].title
        : "";
    const colorScale = getColorScale(
      svTitle || props.statVar.value.dcid,
      geoblaze.min(props.georaster),
      geoblaze.mean(props.georaster),
      geoblaze.max(props.georaster),
      props.display.value.color,
      props.display.value.domain
    );
    const legendHeight = height * LEGEND_HEIGHT_SCALING;
    generateLegendSvg(
      LEGEND_CONTAINER_ID,
      legendHeight,
      colorScale,
      "",
      LEGEND_MARGIN_LEFT
    );
    if (geotiffLayer.current) {
      leafletMap.current.removeLayer(geotiffLayer.current);
    }
    geotiffLayer.current = addGeotiffLayer(
      leafletMap.current,
      props.georaster,
      colorScale
    );
    if (geojsonLayer.current) {
      leafletMap.current.removeLayer(geojsonLayer.current);
    }
    if (props.geoJsonData) {
      geojsonLayer.current = addGeoJsonLayer(
        leafletMap.current,
        props.geoJsonData,
        geotiffLayer.current,
        props.georaster
      );
    }
    setOptimalMapView(leafletMap.current, props.placeInfo.enclosingPlace.dcid);
  }
}
