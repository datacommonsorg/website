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
 * Chart component for drawing a choropleth.
 */

import * as d3 from "d3";
import _ from "lodash";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useCallback } from "react";

import { drawD3Map } from "../../chart/draw_d3_map";
import { generateLegendSvg, getColorScale } from "../../chart/draw_map_utils";
import {
  GeoJsonData,
  GeoJsonFeatureProperties,
  MapPoint,
} from "../../chart/types";
import { formatNumber } from "../../i18n/i18n";
import {
  EUROPE_NAMED_TYPED_PLACE,
  USA_PLACE_DCID,
} from "../../shared/constants";
import { NamedPlace } from "../../shared/types";
import { loadSpinner, removeSpinner } from "../../shared/util";
import { isChildPlaceOf, shouldShowMapBoundaries } from "../shared_util";
import { MAP_CONTAINER_ID, SECTION_CONTAINER_ID } from "./chart";
import { Context, DisplayOptions, PlaceInfo, StatVar } from "./context";
import { useFetchEuropeanCountries } from "./fetcher/european_countries";
import {
  DataPointMetadata,
  getAllChildPlaceTypes,
  getParentPlaces,
  getRedirectLink,
} from "./util";

interface D3MapProps {
  geoJsonData: GeoJsonData;
  mapDataValues: { [dcid: string]: number };
  metadata: { [dcid: string]: DataPointMetadata };
  unit: string;
  mapPointValues: { [dcid: string]: number };
  mapPoints: Array<MapPoint>;
  europeanCountries: Array<NamedPlace>;
}

const LEGEND_CONTAINER_ID = "choropleth-legend";
const CHART_CONTAINER_ID = "chart-container";
const ZOOM_IN_BUTTON_ID = "zoom-in-button";
const ZOOM_OUT_BUTTON_ID = "zoom-out-button";
const LEGEND_MARGIN_LEFT = 30;
const LEGEND_HEIGHT_SCALING = 0.6;
const DEBOUNCE_INTERVAL_MS = 30;
const DEFAULT_ZOOM_TRANSFORMATION = d3.zoomIdentity.scale(1).translate(0, 0);

export function D3Map(props: D3MapProps): JSX.Element {
  const { placeInfo, statVar, display } = useContext(Context);

  const [errorMessage, setErrorMessage] = useState("");
  const [zoomTransformation, setZoomTransformation] = useState(
    DEFAULT_ZOOM_TRANSFORMATION
  );
  const chartContainerRef = useRef<HTMLDivElement>();

  const draw = useCallback(() => {
    document.getElementById(
      LEGEND_CONTAINER_ID
    ).innerHTML = `<div id="legend-unit">${props.unit || ""}</div>`;
    const width = document.getElementById(CHART_CONTAINER_ID).offsetWidth;
    const height = (width * 2) / 5;
    const redirectAction = getMapRedirectAction(
      statVar.value,
      placeInfo.value,
      display.value,
      props.europeanCountries
    );
    const zoomDcid =
      placeInfo.value.enclosingPlace.dcid !== placeInfo.value.selectedPlace.dcid
        ? placeInfo.value.selectedPlace.dcid
        : "";
    if (zoomDcid) {
      const geoJsonFeature = props.geoJsonData.features.find(
        (feature) => feature.properties.geoDcid === zoomDcid
      );
      if (!geoJsonFeature) {
        setErrorMessage("Sorry, we are unable to draw the map for this place.");
        return;
      }
    }
    const svTitle =
      statVar.value.dcid in statVar.value.info
        ? statVar.value.info[statVar.value.dcid].title
        : "";
    const dataValues = Object.values(props.mapDataValues);
    const colorScale = getColorScale(
      svTitle || statVar.value.dcid,
      d3.min(dataValues),
      d3.mean(dataValues),
      d3.max(dataValues),
      display.value.color,
      display.value.domain
    );
    const legendHeight = height * LEGEND_HEIGHT_SCALING;
    const legendWidth = generateLegendSvg(
      LEGEND_CONTAINER_ID,
      legendHeight,
      colorScale,
      "",
      LEGEND_MARGIN_LEFT
    );
    const zoomParams = {
      startingTransformation: zoomTransformation,
      onZoomEnd: (zoomTransformation: d3.ZoomTransform) =>
        setZoomTransformation(zoomTransformation),
      zoomInButtonId: ZOOM_IN_BUTTON_ID,
      zoomOutButtonId: ZOOM_OUT_BUTTON_ID,
    };
    if (!_.isEmpty(props.geoJsonData) && !_.isEmpty(props.mapDataValues)) {
      document.getElementById(MAP_CONTAINER_ID).innerHTML = "";
      drawD3Map(
        MAP_CONTAINER_ID,
        props.geoJsonData,
        height,
        width - legendWidth,
        props.mapDataValues,
        "",
        colorScale,
        redirectAction,
        getTooltipHtml(
          props.metadata,
          statVar.value,
          props.mapDataValues,
          props.mapPointValues,
          props.unit
        ),
        canClickRegion(placeInfo.value, props.europeanCountries),
        false,
        shouldShowMapBoundaries(
          placeInfo.value.selectedPlace,
          placeInfo.value.enclosedPlaceType
        ),
        isChildPlaceOf(
          placeInfo.value.selectedPlace.dcid,
          USA_PLACE_DCID,
          placeInfo.value.parentPlaces
        ),
        placeInfo.value.enclosingPlace.dcid,
        display.value.showMapPoints ? props.mapPoints : [],
        props.mapPointValues,
        zoomDcid,
        zoomParams
      );
    }
  }, [
    props.europeanCountries,
    props.geoJsonData,
    props.mapDataValues,
    props.mapPointValues,
    props.mapPoints,
    props.metadata,
    props.unit,
    statVar.value,
    display.value,
    placeInfo.value,
    zoomTransformation,
  ]);

  // Replot when data changes.
  useEffect(() => {
    if (display.value.showMapPoints && !props.mapPoints) {
      loadSpinner(SECTION_CONTAINER_ID);
      return;
    } else {
      removeSpinner(SECTION_CONTAINER_ID);
    }
    draw();
  }, [display.value.showMapPoints, props.mapPoints, draw]);

  // Replot when chart width changes on sv widget toggle.
  useEffect(() => {
    const debouncedHandler = _.debounce(() => {
      if (!display.value.showMapPoints || props.mapPoints) {
        draw();
      }
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

  if (errorMessage) {
    return <div className="error-message">{errorMessage}</div>;
  } else {
    return (
      <div className="map-section-container">
        <div id={CHART_CONTAINER_ID} ref={chartContainerRef}>
          <div id={MAP_CONTAINER_ID}></div>
          <div id={LEGEND_CONTAINER_ID}></div>
        </div>
        <div className="zoom-button-section">
          <div id={ZOOM_IN_BUTTON_ID} className="zoom-button">
            <i className="material-icons">add</i>
          </div>
          <div id={ZOOM_OUT_BUTTON_ID} className="zoom-button">
            <i className="material-icons">remove</i>
          </div>
        </div>
      </div>
    );
  }
}

const getMapRedirectAction =
  (
    statVar: StatVar,
    placeInfo: PlaceInfo,
    displayOptions: DisplayOptions,
    europeanCountries: Array<NamedPlace>
  ) =>
  (geoProperties: GeoJsonFeatureProperties) => {
    const selectedPlace = {
      dcid: geoProperties.geoDcid,
      name: geoProperties.name,
      types: [placeInfo.enclosedPlaceType],
    };
    const enclosingPlace =
      europeanCountries.findIndex(
        (country) => country.dcid === selectedPlace.dcid
      ) > -1
        ? EUROPE_NAMED_TYPED_PLACE
        : placeInfo.enclosingPlace;
    const parentPlaces = getParentPlaces(
      selectedPlace,
      enclosingPlace,
      placeInfo.parentPlaces
    );
    const redirectLink = getRedirectLink(
      statVar,
      selectedPlace,
      parentPlaces,
      placeInfo.mapPointPlaceType,
      displayOptions
    );
    window.open(redirectLink, "_self");
  };

const getTooltipHtml =
  (
    metadataMapping: { [dcid: string]: DataPointMetadata },
    statVar: StatVar,
    dataValues: { [dcid: string]: number },
    mapPointValues: { [dcid: string]: number },
    unit: string
  ) =>
  (place: NamedPlace) => {
    let titleHtml = `<b>${place.name || place.dcid}</b>`;
    let hasValue = false;
    let value = "Data Missing";
    if (
      dataValues[place.dcid] !== null &&
      dataValues[place.dcid] !== undefined
    ) {
      value = formatNumber(dataValues[place.dcid], unit);
      hasValue = true;
    } else if (mapPointValues[place.dcid]) {
      if (statVar.mapPointSv !== statVar.dcid) {
        const mapPointSvTitle =
          statVar.mapPointSv in statVar.info
            ? statVar.info[statVar.mapPointSv].title
            : "";
        titleHtml =
          `<b>${mapPointSvTitle || statVar.mapPointSv}</b><br />` + titleHtml;
      }
      value = formatNumber(mapPointValues[place.dcid], unit);
      hasValue = true;
    }
    const metadata = metadataMapping[place.dcid];
    const showPopDateMessage =
      statVar.perCapita &&
      !_.isEmpty(metadata.popDate) &&
      !metadata.placeStatDate.includes(metadata.popDate) &&
      !metadata.popDate.includes(metadata.placeStatDate);
    if (!hasValue || !(place.dcid in metadataMapping)) {
      return `${titleHtml}: <wbr>${value}<br />`;
    }
    if (!_.isEmpty(metadata.errorMessage)) {
      return `${titleHtml}: <wbr>${metadata.errorMessage}<br />`;
    }
    const footer = showPopDateMessage
      ? `<footer><sup>1</sup> Uses population data from: <wbr>${metadata.popDate}</footer>`
      : "";
    const html =
      `${titleHtml} (${metadata.placeStatDate}): <wbr><b>${value}</b>${
        showPopDateMessage ? "<sup>1</sup>" : ""
      }<br />` + footer;
    return html;
  };

const canClickRegion =
  (placeInfo: PlaceInfo, europeanCountries: Array<NamedPlace>) =>
  (placeDcid: string) => {
    const enclosingPlace =
      europeanCountries.findIndex((country) => country.dcid === placeDcid) > -1
        ? EUROPE_NAMED_TYPED_PLACE
        : placeInfo.enclosingPlace;
    const parentPlaces = getParentPlaces(
      placeInfo.selectedPlace,
      enclosingPlace,
      placeInfo.parentPlaces
    );
    const placeAsNamedTypedPlace = {
      dcid: placeDcid,
      name: placeDcid,
      types: [placeInfo.enclosedPlaceType],
    };
    return !_.isEmpty(
      getAllChildPlaceTypes(placeAsNamedTypedPlace, parentPlaces)
    );
  };
