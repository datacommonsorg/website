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
import React, { ReactNode, useContext, useEffect } from "react";
import { Card, Container, FormGroup, Input, Label } from "reactstrap";

import { GeoJsonData, MapPoint } from "../../chart/types";
import { CLASS_DC_CHART_HOLDER } from "../../constants/css_constants";
import { FacetSelectorFacetInfo } from "../../shared/facet_selector";
import {
  GA_EVENT_TOOL_CHART_PLOT,
  GA_PARAM_PLACE_DCID,
  GA_PARAM_STAT_VAR,
  triggerGAEvent,
} from "../../shared/ga_events";
import { DataPointMetadata, NamedPlace } from "../../shared/types";
import { ToolChartFooter } from "../shared/tool_chart_footer";
import { StatVarInfo } from "../timeline/chart_region";
import { Context } from "./context";
import { D3Map } from "./d3_map";
// import { LeafletMap } from "./leaflet_map";
import { getTitle } from "./util";

export enum MAP_TYPE {
  LEAFLET,
  D3,
}
interface ChartProps {
  geoJsonData: GeoJsonData;
  mapDataValues: { [dcid: string]: number };
  metadata: { [dcid: string]: DataPointMetadata };
  breadcrumbDataValues: { [dcid: string]: number };
  dates: Set<string>;
  sources: Set<string>;
  unit: string;
  mapPointValues: { [dcid: string]: number };
  mapPoints: Array<MapPoint>;
  europeanCountries: Array<NamedPlace>;
  rankingLink: string;
  facetList: FacetSelectorFacetInfo[];
  geoRaster: any;
  mapType: MAP_TYPE;
  children: ReactNode;
  borderGeoJsonData?: GeoJsonData;
}

export const MAP_CONTAINER_ID = "choropleth-map";
export const LEGEND_CONTAINER_ID = "choropleth-legend";
const DATE_RANGE_INFO_ID = "date-range-info";
const DATE_RANGE_INFO_TEXT_ID = "date-range-tooltip-text";
export const SECTION_CONTAINER_ID = "map-chart";

export function Chart(props: ChartProps): JSX.Element {
  const { placeInfo, statVar, display } = useContext(Context);

  const mainSvInfo: StatVarInfo =
    statVar.value.dcid in statVar.value.info
      ? statVar.value.info[statVar.value.dcid]
      : {};
  const title = getTitle(
    Array.from(props.dates),
    mainSvInfo.title || statVar.value.dcid,
    statVar.value.perCapita
  );
  const placeDcid = placeInfo.value.enclosingPlace.dcid;
  const statVarDcid = statVar.value.dcid;

  // Triggered only when stat vars or places change and send data to google analytics.
  useEffect(() => {
    triggerGAEvent(GA_EVENT_TOOL_CHART_PLOT, {
      [GA_PARAM_PLACE_DCID]: placeInfo.value.enclosingPlace.dcid,
      [GA_PARAM_STAT_VAR]: statVar.value.dcid,
    });
  }, [statVar.value.dcid, placeInfo.value.enclosingPlace.dcid]);

  return (
    <div className="chart-section-container">
      <Card className="chart-section-card">
        <Container id={SECTION_CONTAINER_ID} fluid={true}>
          <div id="map-chart-screen" className="screen">
            <div id="spinner"></div>
          </div>
          <div className={`chart-section ${CLASS_DC_CHART_HOLDER}`}>
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
                The date range represents the dates of the data shown in this
                map.
              </div>
            </div>
            {/* Disable LEAFLET as georaster-layer-for-leaflet can not be compiled server side in commonjs mode, see tsconfing.json "module": "CommonJS" */}
            {/* {props.mapType === MAP_TYPE.LEAFLET ? (
              <LeafletMap
                geoJsonData={props.geoJsonData}
                geoRaster={props.geoRaster}
                metadata={props.metadata}
                unit={props.unit}
              />
            ) : ( */}
            <D3Map
              geoJsonData={props.geoJsonData}
              mapDataValues={props.mapDataValues}
              metadata={props.metadata}
              unit={props.unit}
              mapPointValues={props.mapPointValues}
              mapPoints={props.mapPoints}
              europeanCountries={props.europeanCountries}
              borderGeoJsonData={props.borderGeoJsonData}
            />
            {/* )} */}
            {props.children}
            <div className="map-links">
              {mainSvInfo.ranked && (
                <a className="explore-timeline-link" href={props.rankingLink}>
                  <span className="explore-timeline-text">
                    Explore rankings
                  </span>
                  <i className="material-icons">keyboard_arrow_right</i>
                </a>
              )}
              {!mainSvInfo.ranked &&
                (placeInfo.value.selectedPlace.dcid in props.mapDataValues ||
                  placeInfo.value.selectedPlace.dcid in
                    props.breadcrumbDataValues) && (
                  <a
                    className="explore-timeline-link"
                    href={`/tools/timeline#place=${placeDcid}&statsVar=${statVarDcid}`}
                  >
                    <span className="explore-timeline-text">
                      Explore timeline
                    </span>
                    <i className="material-icons">keyboard_arrow_right</i>
                  </a>
                )}
            </div>
          </div>
        </Container>
      </Card>
      <ToolChartFooter
        chartId="map"
        sources={props.sources}
        mMethods={null}
        svFacetId={{ [statVarDcid]: statVar.value.metahash }}
        facetList={props.facetList}
        onSvFacetIdUpdated={(svFacetId) =>
          statVar.setMetahash(svFacetId[statVar.value.dcid])
        }
        hideIsRatio={props.mapType === MAP_TYPE.LEAFLET}
        isPerCapita={statVar.value.perCapita}
        onIsPerCapitaUpdated={(isPerCapita: boolean) =>
          statVar.setPerCapita(isPerCapita)
        }
      >
        {placeInfo.value.mapPointPlaceType && (
          <div className="chart-option">
            <FormGroup check>
              <Label check>
                <Input
                  id="show-installations"
                  type="checkbox"
                  checked={display.value.showMapPoints}
                  onChange={(e) => display.setShowMapPoints(e.target.checked)}
                />
                Show Installations
              </Label>
            </FormGroup>
          </div>
        )}
      </ToolChartFooter>
    </div>
  );
}

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
