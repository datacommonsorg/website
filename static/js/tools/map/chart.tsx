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

import React, { useEffect, useState, useRef } from "react";
import { GeoJsonData, GeoJsonFeatureProperties } from "../../chart/types";
import { PlaceInfo, StatVarInfo } from "./context";
import { Container } from "reactstrap";
import _ from "lodash";
import {
  drawChoropleth,
  getColorScale,
  generateLegendSvg,
} from "../../chart/draw_choropleth";
import {
  MAP_REDIRECT_PREFIX,
  updateHashPlaceInfo,
  updateHashStatVarInfo,
  USA_CHILD_PLACE_TYPES,
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
  statVarInfo: StatVarInfo;
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

export function Chart(props: ChartProps): JSX.Element {
  const [errorMessage, setErrorMessage] = useState("");
  const title = getTitle(Array.from(props.dates), props.statVarInfo.name);
  const sourcesJsx = getSourcesJsx(props.sources);
  const placeDcid = props.placeInfo.enclosingPlace.dcid;
  const statVarDcid = _.findKey(props.statVarInfo.statVar);
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
            <h3>{title}</h3>
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
  document.getElementById(LEGEND_CONTAINER_ID).innerHTML = "";
  const width = document.getElementById(CHART_CONTAINER_ID).offsetWidth;
  const height = (width * 2) / 5;
  const redirectAction = getMapRedirectAction(
    props.statVarInfo,
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
  const colorScale = getColorScale(props.statVarInfo.name, props.mapDataValues);
  const legendHeight = height * LEGEND_HEIGHT_SCALING;
  const legendWidth = generateLegendSvg(
    LEGEND_CONTAINER_ID,
    legendHeight,
    colorScale,
    props.unit,
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
        props.statVarInfo,
        props.mapDataValues,
        props.unit
      ),
      false,
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

const getMapRedirectAction = (
  statVarInfo: StatVarInfo,
  placeInfo: PlaceInfo
) => (geoProperties: GeoJsonFeatureProperties) => {
  let hash = updateHashStatVarInfo("", statVarInfo);
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
  statVarInfo: StatVarInfo,
  dataValues: { [dcid: string]: number },
  unit: string
) => (place: NamedPlace) => {
  const titleHtml = `<b>${place.name}</b><br/>`;
  let hasValue = false;
  let value = "Data Missing";
  if (dataValues[place.dcid]) {
    value = formatNumber(dataValues[place.dcid], unit);
    hasValue = true;
  }
  if (!hasValue || !(place.dcid in metadataMapping)) {
    return titleHtml + `${statVarInfo.name}: <wbr>${value}<br />`;
  }
  const metadata = metadataMapping[place.dcid];
  if (!_.isEmpty(metadata.errorMessage)) {
    return (
      titleHtml + `${statVarInfo.name}: <wbr>${metadata.errorMessage}<br />`
    );
  }
  let sources = urlToDomain(metadata.statVarSource);
  if (statVarInfo.perCapita && !_.isEmpty(metadata.popSource)) {
    const popDomain = urlToDomain(metadata.popSource);
    if (popDomain !== sources) {
      sources += `, ${popDomain}`;
    }
  }
  const showPopDateMessage =
    statVarInfo.perCapita &&
    !_.isEmpty(metadata.popDate) &&
    !metadata.statVarDate.includes(metadata.popDate) &&
    !metadata.popDate.includes(metadata.statVarDate);
  const popDateHtml = showPopDateMessage
    ? `<sup>*</sup> Uses population data from: <wbr>${metadata.popDate}`
    : "";
  const html =
    titleHtml +
    `${statVarInfo.name} (${metadata.statVarDate}): <wbr>${value}<br />` +
    `<footer>Data from: <wbr>${sources} <br/>${popDateHtml}</footer>`;
  return html;
};
