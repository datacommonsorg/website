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

import React, { useEffect, useState } from "react";
import { GeoJsonData, GeoJsonFeatureProperties } from "../../chart/types";
import { PlaceInfo, StatVar } from "./context";
import { Container } from "reactstrap";
import _ from "lodash";
import * as d3 from "d3";
import {
  drawChoropleth,
  getColorScale,
  generateLegendSvg,
} from "../../chart/draw_choropleth";
import {
  MAP_REDIRECT_PREFIX,
  updateHashPlaceInfo,
  updateHashStatVar,
  USA_CHILD_PLACE_TYPES,
  USA_PLACE_HIERARCHY,
} from "./util";
import { urlToDomain } from "../../shared/util";
import { ChartOptions } from "./chart_options";
import { NamedPlace } from "../../shared/types";
import { DataPointMetadata } from "./chart_loader";
import { formatNumber } from "../../i18n/i18n";

interface ChartProps {
  geoJsonData: GeoJsonData;
  mapDataValues: { [dcid: string]: number };
  metadata: { [dcid: string]: DataPointMetadata };
  breadcrumbDataValues: { [dcid: string]: number };
  placeInfo: PlaceInfo;
  statVar: StatVar;
  dates: Set<string>;
  sources: Set<string>;
  unit: string;
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

export function Chart(props: ChartProps): JSX.Element {
  const [errorMessage, setErrorMessage] = useState("");
  const title = getTitle(
    Array.from(props.dates),
    props.statVar.info.title ? props.statVar.info.title : props.statVar.dcid
  );
  const sourcesJsx = getSourcesJsx(props.sources);
  const placeDcid = props.placeInfo.enclosingPlace.dcid;
  const statVarDcid = props.statVar.dcid;
  const [chartWidth, setChartWidth] = useState(0);
  useEffect(() => {
    draw(props, setErrorMessage, true);
  }, [props]);
  useEffect(() => {
    function _handleWindowResize() {
      const chartContainer = document.getElementById(CHART_CONTAINER_ID);
      if (chartContainer) {
        const width = chartContainer.offsetWidth;
        if (width !== chartWidth) {
          setChartWidth(width);
          draw(props, setErrorMessage, false);
        }
      }
    }
    window.addEventListener("resize", _handleWindowResize);
    return () => {
      window.removeEventListener("resize", _handleWindowResize);
    };
  }, [props]);
  return (
    <>
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
          <ChartOptions
            dataValues={props.breadcrumbDataValues}
            placeInfo={props.placeInfo}
            metadata={props.metadata}
            unit={props.unit}
          />
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
    </>
  );
}

function draw(
  props: ChartProps,
  setErrorMessage: (errorMessage: string) => void,
  shouldDrawMap: boolean
): void {
  document.getElementById(LEGEND_CONTAINER_ID).innerHTML = `<div>${
    props.unit || ""
  }</div>`;
  const width = document.getElementById(CHART_CONTAINER_ID).offsetWidth;
  const height = (width * 2) / 5;
  const redirectAction = getMapRedirectAction(props.statVar, props.placeInfo);
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
    props.statVar.info.title ? props.statVar.info.title : props.statVar.dcid,
    props.mapDataValues
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
      props.placeInfo.enclosedPlaceType in USA_CHILD_PLACE_TYPES,
      redirectAction,
      getTooltipHtml(
        props.metadata,
        props.statVar,
        props.mapDataValues,
        props.unit
      ),
      false,
      shouldShowBoundary(props.placeInfo),
      zoomDcid,
      ZOOM_IN_BUTTON_ID,
      ZOOM_OUT_BUTTON_ID
    );
  }
}

export function shouldShowBoundary(placeInfo: PlaceInfo): boolean {
  const selectedPlaceTypes = placeInfo.selectedPlace.types;
  let selectedPlaceTypeIdx = -1;
  if (selectedPlaceTypes) {
    selectedPlaceTypeIdx = USA_PLACE_HIERARCHY.indexOf(selectedPlaceTypes[0]);
  }
  const enclosedPlaceTypeIdx = USA_PLACE_HIERARCHY.indexOf(
    placeInfo.enclosedPlaceType
  );
  if (selectedPlaceTypeIdx < 0 || enclosedPlaceTypeIdx < 0) {
    return true;
  }
  return enclosedPlaceTypeIdx - selectedPlaceTypeIdx < 2;
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
  let hash = updateHashStatVar("", statVar);
  const selectedPlace = {
    dcid: geoProperties.geoDcid,
    name: geoProperties.name,
    types: [placeInfo.enclosedPlaceType],
  };
  const enclosedPlaceType =
    USA_CHILD_PLACE_TYPES[placeInfo.enclosedPlaceType][0];
  hash = updateHashPlaceInfo(hash, {
    enclosingPlace: { dcid: "", name: "" },
    enclosedPlaces: [],
    enclosedPlaceType,
    selectedPlace,
    parentPlaces: [],
  });
  const redirectLink = `${MAP_REDIRECT_PREFIX}#${encodeURIComponent(hash)}`;
  window.open(redirectLink, "_self");
};

const getTooltipHtml = (
  metadataMapping: { [dcid: string]: DataPointMetadata },
  statVar: StatVar,
  dataValues: { [dcid: string]: number },
  unit: string
) => (place: NamedPlace) => {
  const statVarTitle = statVar.info.title ? statVar.info.title : statVar.dcid;
  const titleHtml = `<b>${place.name}</b><br/>`;
  let hasValue = false;
  let value = "Data Missing";
  if (dataValues[place.dcid]) {
    value = formatNumber(dataValues[place.dcid], unit);
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

const onDateRangeMouseOut = () => {
  d3.select(`#${DATE_RANGE_INFO_TEXT_ID}`).style("visibility", "hidden");
};
