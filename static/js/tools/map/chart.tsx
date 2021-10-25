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
 * Chart component for drawing a choropleth.
 */

import * as d3 from "d3";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import { Card, Container, FormGroup, Input, Label } from "reactstrap";

import {
  drawChoropleth,
  generateLegendSvg,
  getColorScale,
} from "../../chart/draw_choropleth";
import {
  GeoJsonData,
  GeoJsonFeatureProperties,
  MapPoint,
} from "../../chart/types";
import { formatNumber } from "../../i18n/i18n";
import {
  EARTH_NAMED_TYPED_PLACE,
  INDIA_PLACE_DCID,
  USA_PLACE_DCID,
} from "../../shared/constants";
import { NamedPlace } from "../../shared/types";
import { urlToDomain } from "../../shared/util";
import { isChildPlaceOf, shouldShowMapBoundaries } from "../shared_util";
import { DataPointMetadata } from "./chart_loader";
import { DisplayOptions, PlaceInfo, StatVar, StatVarWrapper } from "./context";
import { CHILD_PLACE_TYPES, getRedirectLink } from "./util";

interface ChartProps {
  geoJsonData: GeoJsonData;
  mapDataValues: { [dcid: string]: number };
  metadata: { [dcid: string]: DataPointMetadata };
  breadcrumbDataValues: { [dcid: string]: number };
  placeInfo: PlaceInfo;
  statVar: StatVarWrapper;
  dates: Set<string>;
  sources: Set<string>;
  unit: string;
  mapPointValues: { [dcid: string]: number };
  mapPoints: Array<MapPoint>;
  display: DisplayOptions;
}

const MAP_CONTAINER_ID = "choropleth-map";
const LEGEND_CONTAINER_ID = "choropleth-legend";
const CHART_CONTAINER_ID = "chart-container";
const ZOOM_IN_BUTTON_ID = "zoom-in-button";
const ZOOM_OUT_BUTTON_ID = "zoom-out-button";
const LEGEND_MARGIN_LEFT = 30;
const LEGEND_HEIGHT_SCALING = 0.6;
const DATE_RANGE_INFO_ID = "date-range-info";
const DATE_RANGE_INFO_TEXT_ID = "date-range-tooltip-text";
const NO_PER_CAPITA_TYPES = ["medianValue"];

export function Chart(props: ChartProps): JSX.Element {
  const statVarInfo = props.statVar.value;
  const [errorMessage, setErrorMessage] = useState("");
  const [denomInput, setDenomInput] = useState(props.statVar.value.denom);
  const title = getTitle(
    Array.from(props.dates),
    statVarInfo.info.title ? statVarInfo.info.title : statVarInfo.dcid
  );
  const sourcesJsx = getSourcesJsx(props.sources);
  const placeDcid = props.placeInfo.enclosingPlace.dcid;
  const statVarDcid = statVarInfo.dcid;
  const [chartWidth, setChartWidth] = useState(0);
  useEffect(() => {
    draw(
      props,
      setErrorMessage,
      true,
      props.display.color,
      props.display.domain
    );
  }, [props]);
  useEffect(() => {
    function _handleWindowResize() {
      const chartContainer = document.getElementById(CHART_CONTAINER_ID);
      if (chartContainer) {
        const width = chartContainer.offsetWidth;
        if (width !== chartWidth) {
          setChartWidth(width);
          draw(props, setErrorMessage, false),
            props.display.color,
            props.display.domain;
        }
      }
    }
    window.addEventListener("resize", _handleWindowResize);
    return () => {
      window.removeEventListener("resize", _handleWindowResize);
    };
  }, [props]);
  return (
    <Card className="chart-section-card">
      <Container>
        <div className="chart-section">
          <div className="map-title">
            <h3>
              {title}
              {props.dates.size > 1 && (
                <span
                  onMouseOver={onDateRangeMouseOver}
                  onMouseOut={onDateRangeMouseOut}
                  id={DATE_RANGE_INFO_ID}
                >
                  <i className="material-icons-outlined">info</i>
                </span>
              )}
            </h3>
            <div id={DATE_RANGE_INFO_TEXT_ID}>
              The date range represents the dates of the data shown in this map.
            </div>
          </div>
          {errorMessage ? (
            <div className="error-message">{errorMessage}</div>
          ) : (
            <div className="map-section-container">
              <div id={CHART_CONTAINER_ID}>
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
          )}
          {NO_PER_CAPITA_TYPES.indexOf(statVarInfo.info.st) === -1 && (
            <div className="per-capita-option">
              <FormGroup check>
                <Label check>
                  <Input
                    id="per-capita"
                    type="checkbox"
                    checked={statVarInfo.perCapita}
                    onChange={(e) =>
                      props.statVar.setPerCapita(e.target.checked)
                    }
                  />
                  Ratio of
                </Label>
                <input
                  className="denom-input"
                  onBlur={() => props.statVar.setDenom(denomInput)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      props.statVar.setDenom(denomInput);
                    }
                  }}
                  type="text"
                  value={denomInput}
                  onChange={(e) => setDenomInput(e.target.value)}
                  disabled={!props.statVar.value.perCapita}
                />
              </FormGroup>
            </div>
          )}
          <div className="map-footer">
            <div className="sources">Data from {sourcesJsx}</div>
            <div
              className="explore-timeline-link"
              onClick={() => exploreTimelineOnClick(placeDcid, statVarDcid)}
            >
              <span className="explore-timeline-text">Explore timeline</span>
              <i className="material-icons">keyboard_arrow_right</i>
            </div>
          </div>
        </div>
      </Container>
    </Card>
  );
}

function draw(
  props: ChartProps,
  setErrorMessage: (errorMessage: string) => void,
  shouldDrawMap: boolean,
  color?: string,
  domain?: [number, number, number]
): void {
  document.getElementById(
    LEGEND_CONTAINER_ID
  ).innerHTML = `<div id="legend-unit">${props.unit || ""}</div>`;
  const width = document.getElementById(CHART_CONTAINER_ID).offsetWidth;
  const height = (width * 2) / 5;
  const redirectAction = getMapRedirectAction(
    props.statVar.value,
    props.placeInfo
  );
  const zoomDcid =
    props.placeInfo.enclosingPlace.dcid !== props.placeInfo.selectedPlace.dcid
      ? props.placeInfo.selectedPlace.dcid
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
  const colorScale = getColorScale(
    props.statVar.value.info.title
      ? props.statVar.value.info.title
      : props.statVar.value.dcid,
    props.mapDataValues,
    color,
    domain
  );
  const legendHeight = height * LEGEND_HEIGHT_SCALING;
  const legendWidth = generateLegendSvg(
    LEGEND_CONTAINER_ID,
    legendHeight,
    colorScale,
    "",
    LEGEND_MARGIN_LEFT
  );
  if (
    shouldDrawMap &&
    !_.isEmpty(props.geoJsonData) &&
    !_.isEmpty(props.mapDataValues)
  ) {
    document.getElementById(MAP_CONTAINER_ID).innerHTML = "";
    drawChoropleth(
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
        props.statVar.value,
        props.mapDataValues,
        props.mapPointValues,
        props.unit
      ),
      canClickRegion(props.placeInfo),
      false,
      shouldShowMapBoundaries(
        props.placeInfo.selectedPlace,
        props.placeInfo.enclosedPlaceType
      ),
      isChildPlaceOf(
        props.placeInfo.selectedPlace.dcid,
        USA_PLACE_DCID,
        props.placeInfo.parentPlaces
      ),
      props.mapPoints,
      props.mapPointValues,
      zoomDcid,
      ZOOM_IN_BUTTON_ID,
      ZOOM_OUT_BUTTON_ID
    );
  }
}

function getTitle(statVarDates: string[], statVarName: string): string {
  const minDate = _.min(statVarDates);
  const maxDate = _.max(statVarDates);
  const dateRange =
    minDate === maxDate ? `(${minDate})` : `(${minDate} to ${maxDate})`;
  return `${statVarName} ${dateRange}`;
}

function getSourcesJsx(sources: Set<string>): JSX.Element[] {
  const sourceList: string[] = Array.from(sources);
  const seenSourceDomains = new Set();
  const sourcesJsx = sourceList.map((source, index) => {
    const domain = urlToDomain(source);
    if (seenSourceDomains.has(domain)) {
      return null;
    }
    seenSourceDomains.add(domain);
    return (
      <span key={source}>
        {index > 0 ? ", " : ""}
        <a href={source}>{domain}</a>
      </span>
    );
  });
  return sourcesJsx;
}

function exploreTimelineOnClick(placeDcid: string, statVarDcid: string): void {
  window.open(`/tools/timeline#place=${placeDcid}&statsVar=${statVarDcid}`);
}

const getMapRedirectAction = (statVar: StatVar, placeInfo: PlaceInfo) => (
  geoProperties: GeoJsonFeatureProperties
) => {
  const selectedPlace = {
    dcid: geoProperties.geoDcid,
    name: geoProperties.name,
    types: [placeInfo.enclosedPlaceType],
  };
  const redirectLink = getRedirectLink(
    statVar,
    selectedPlace,
    placeInfo.parentPlaces,
    placeInfo.mapPointsPlaceType
  );
  window.open(redirectLink, "_self");
};

const getTooltipHtml = (
  metadataMapping: { [dcid: string]: DataPointMetadata },
  statVar: StatVar,
  dataValues: { [dcid: string]: number },
  mapPointValues: { [dcid: string]: number },
  unit: string
) => (place: NamedPlace) => {
  const statVarTitle = statVar.info.title ? statVar.info.title : statVar.dcid;
  const titleHtml = `<b>${place.name}</b><br/>`;
  let hasValue = false;
  let value = "Data Missing";
  if (dataValues[place.dcid]) {
    value = formatNumber(dataValues[place.dcid], unit);
    hasValue = true;
  } else if (mapPointValues[place.dcid]) {
    value = formatNumber(mapPointValues[place.dcid], unit);
    hasValue = true;
  }
  if (!hasValue || !(place.dcid in metadataMapping)) {
    return titleHtml + `${statVarTitle}: <wbr>${value}<br />`;
  }
  const metadata = metadataMapping[place.dcid];
  if (!_.isEmpty(metadata.errorMessage)) {
    return titleHtml + `${statVarTitle}: <wbr>${metadata.errorMessage}<br />`;
  }
  let sources = urlToDomain(metadata.statVarSource);
  if (statVar.perCapita && !_.isEmpty(metadata.popSource)) {
    const popDomain = urlToDomain(metadata.popSource);
    if (popDomain !== sources) {
      sources += `, ${popDomain}`;
    }
  }
  const showPopDateMessage =
    statVar.perCapita &&
    !_.isEmpty(metadata.popDate) &&
    !metadata.statVarDate.includes(metadata.popDate) &&
    !metadata.popDate.includes(metadata.statVarDate);
  const popDateHtml = showPopDateMessage
    ? `<sup>*</sup> Uses population data from: <wbr>${metadata.popDate}`
    : "";
  const html =
    titleHtml +
    `${statVarTitle} (${metadata.statVarDate}): <wbr>${value}<br />` +
    `<footer>Data from: <wbr>${sources} <br/>${popDateHtml}</footer>`;
  return html;
};

const onDateRangeMouseOver = () => {
  const offset = 20;
  const left =
    (d3.select(`#${DATE_RANGE_INFO_ID}`).node() as HTMLElement).offsetLeft +
    offset;
  d3.select(`#${DATE_RANGE_INFO_TEXT_ID}`)
    .style("left", left + "px")
    .style("visibility", "visible");
};

const canClickRegion = (placeInfo: PlaceInfo) => (placeDcid: string) => {
  if (!(placeInfo.enclosedPlaceType in CHILD_PLACE_TYPES)) {
    return false;
  }
  // Add European countries to this list.
  return (
    placeInfo.enclosingPlace.dcid !== EARTH_NAMED_TYPED_PLACE.dcid ||
    placeDcid === USA_PLACE_DCID ||
    placeDcid === INDIA_PLACE_DCID
  );
};
const onDateRangeMouseOut = () => {
  d3.select(`#${DATE_RANGE_INFO_TEXT_ID}`).style("visibility", "hidden");
};
