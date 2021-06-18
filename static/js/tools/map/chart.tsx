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

import React, { useEffect } from "react";
import { GeoJsonData, GeoJsonFeatureProperties } from "../../chart/types";
import { PlaceInfo, StatVarInfo } from "./context";
import { Container } from "reactstrap";
import _ from "lodash";
import { drawChoropleth } from "../../chart/draw_choropleth";
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

const SVG_CONTAINER_ID = "choropleth_map";

export function Chart(props: ChartProps): JSX.Element {
  useEffect(() => {
    draw(props);
  }, [props]);
  const title = getTitle(Array.from(props.dates), props.statVarInfo.name);
  const sourcesJsx = getSourcesJsx(props.sources);
  const placeDcid = props.placeInfo.enclosingPlace.dcid;
  const statVarDcid = _.findKey(props.statVarInfo.statVar);
  return (
    <>
      <Container>
        <div className="chart-section">
          <div className="map-title">
            <h3>{title}</h3>
          </div>
          <div id={SVG_CONTAINER_ID}></div>
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

function draw(props: ChartProps): void {
  document.getElementById(SVG_CONTAINER_ID).innerHTML = "";
  const width = document.getElementById(SVG_CONTAINER_ID).offsetWidth;
  const height = (width * 2) / 5;
  const getRedirectLink = getMapRedirectLink(
    props.statVarInfo,
    props.placeInfo
  );
  if (!_.isEmpty(props.geoJsonData) && !_.isEmpty(props.mapDataValues)) {
    drawChoropleth(
      SVG_CONTAINER_ID,
      props.geoJsonData,
      height,
      width,
      props.mapDataValues,
      "",
      props.statVarInfo.name,
      props.placeInfo.enclosedPlaceType in USA_CHILD_PLACE_TYPES,
      getRedirectLink,
      getTooltipHtml(
        props.metadata,
        props.statVarInfo,
        props.mapDataValues,
        props.unit
      )
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

const getMapRedirectLink = (statVarInfo: StatVarInfo, placeInfo: PlaceInfo) => (
  geoProperties: GeoJsonFeatureProperties
) => {
  let hash = updateHashStatVarInfo("", statVarInfo);
  const enclosingPlace = {
    dcid: geoProperties.geoDcid,
    name: geoProperties.name,
  };
  const enclosedPlaceType =
    USA_CHILD_PLACE_TYPES[placeInfo.enclosedPlaceType][0];
  hash = updateHashPlaceInfo(hash, {
    enclosedPlaces: [],
    enclosedPlaceType,
    enclosingPlace,
    parentPlaces: [],
  });
  return `${MAP_REDIRECT_PREFIX}#${encodeURIComponent(hash)}`;
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
    return titleHtml + `${statVarInfo.name}: ${value}<br />`;
  }
  const metadata = metadataMapping[place.dcid];
  if (!_.isEmpty(metadata.errorMessage)) {
    return titleHtml + `${statVarInfo.name}: ${metadata.errorMessage}<br />`;
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
    ? `<sup>*</sup> Uses population data from: ${metadata.popDate}`
    : "";
  const html =
    titleHtml +
    `${statVarInfo.name} (${metadata.statVarDate}): ${value}<br />` +
    `<footer>Data from: ${sources} <br/>${popDateHtml}</footer>`;
  return html;
};
