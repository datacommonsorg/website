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
import { GeoRaster } from "georaster-layer-for-leaflet";
import L from "leaflet";
import _ from "lodash";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  addGeoJsonLayer,
  addGeotiffLayer,
  setOptimalMapView,
} from "../../chart/draw_leaflet_map";
import { generateLegendSvg, getColorScale } from "../../chart/draw_map_utils";
import { GeoJsonData } from "../../chart/types";
import { DataPointMetadata } from "../../shared/types";
import { removeSpinner } from "../../shared/util";
import { MAP_CONTAINER_ID } from "./chart";
import { Context } from "./context";
import { CHART_LOADER_SCREEN } from "./util";

interface LeafletMapProps {
  geoJsonData: GeoJsonData;
  geoRaster: GeoRaster;
  metadata: { [dcid: string]: DataPointMetadata };
  unit: string;
}

const LEGEND_CONTAINER_ID = "choropleth-legend";
const CHART_CONTAINER_ID = "chart-container";
const LEGEND_MARGIN_LEFT = 30;
const LEGEND_HEIGHT_SCALING = 0.6;
const DEBOUNCE_INTERVAL_MS = 30;

export function LeafletMap(props: LeafletMapProps): JSX.Element {
  const { placeInfo, statVar, display } = useContext(Context);

  const [errorMessage, setErrorMessage] = useState("");
  const chartContainerRef = useRef<HTMLDivElement>();
  const legendContainerRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef(null);
  const geotiffLayer = useRef(null);
  const geojsonLayer = useRef(null);
  const [chartHeight, setChartHeight] = useState("");

  useEffect(() => {
    leafletMap.current = L.map(MAP_CONTAINER_ID, {
      center: [0, 0],
      zoom: 3,
    });
  }, []);

  useEffect(() => {
    // resize leaflet map when chartHeight changes
    if (leafletMap.current) {
      leafletMap.current.invalidateSize();
    }
  }, [chartHeight]);

  // Replot when chart width changes on sv widget toggle.
  useEffect(() => {
    const debouncedHandler = _.debounce(() => {
      const width = document.getElementById(CHART_CONTAINER_ID).offsetWidth;
      const height = (width * 2) / 5;
      setChartHeight(height + "px");
    }, DEBOUNCE_INTERVAL_MS);
    const resizeObserver = new ResizeObserver(debouncedHandler);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }
    return () => {
      resizeObserver.unobserve(chartContainerRef.current);
      debouncedHandler.cancel();
    };
  }, [props, chartContainerRef]);

  // Draw a GeoTIFF layer as the background and add a GeoJSON layer to show the
  // boundaries if there is GeoJSON data available.
  const plot = useCallback(() => {
    document.getElementById(
      LEGEND_CONTAINER_ID
    ).innerHTML = `<div id="legend-unit">${props.unit || ""}</div>`;
    const width = document.getElementById(CHART_CONTAINER_ID).offsetWidth;
    const height = (width * 2) / 5;
    const svTitle =
      statVar.value.dcid in statVar.value.info
        ? statVar.value.info[statVar.value.dcid].title
        : "";
    const colorScale = getColorScale(
      svTitle || statVar.value.dcid,
      geoblaze.min(props.geoRaster),
      geoblaze.mean(props.geoRaster),
      geoblaze.max(props.geoRaster),
      display.value.color,
      display.value.domain
    );
    const legendHeight = height * LEGEND_HEIGHT_SCALING;
    generateLegendSvg(
      legendContainerRef.current,
      legendHeight,
      [{ colorScale, unit: "" }],
      LEGEND_MARGIN_LEFT
    );
    if (geotiffLayer.current) {
      leafletMap.current.removeLayer(geotiffLayer.current);
    }
    geotiffLayer.current = addGeotiffLayer(
      leafletMap.current,
      props.geoRaster,
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
        props.geoRaster
      );
    }
    setOptimalMapView(leafletMap.current, placeInfo.value.enclosingPlace.dcid);
    removeSpinner(CHART_LOADER_SCREEN);
  }, [
    props.geoJsonData,
    props.geoRaster,
    props.unit,
    statVar.value.dcid,
    statVar.value.info,
    display.value.color,
    display.value.domain,
    placeInfo.value.enclosingPlace.dcid,
  ]);

  // Replot when data changes.
  // TODO: handle resizing of chart area
  useEffect(() => {
    if (props.geoRaster) {
      plot();
    }
  }, [props.geoRaster, plot]);

  if (errorMessage) {
    return <div className="error-message">{errorMessage}</div>;
  } else {
    return (
      <div className="map-section-container leaflet-map-container">
        <div
          id={CHART_CONTAINER_ID}
          ref={chartContainerRef}
          style={{ height: chartHeight }}
        >
          <div id={MAP_CONTAINER_ID}></div>
          <div id={LEGEND_CONTAINER_ID} ref={legendContainerRef}></div>
        </div>
      </div>
    );
  }
}
