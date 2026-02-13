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
import React, {
  ReactElement,
  ReactNode,
  RefObject,
  useContext,
  useEffect,
} from "react";
import { Card, Container, FormGroup, Input, Label } from "reactstrap";

import { GeoJsonData, MapPoint } from "../../chart/types";
import { FacetSelectorFacetInfo } from "../../shared/facet_selector/facet_selector";
import {
  GA_EVENT_TOOL_CHART_PLOT,
  GA_PARAM_PLACE_DCID,
  GA_PARAM_STAT_VAR,
  triggerGAEvent,
} from "../../shared/ga_events";
import { ObservationSpec } from "../../shared/observation_specs";
import { StatVarInfo } from "../../shared/stat_var";
import { DataPointMetadata } from "../../shared/types";
import {
  getFacetMetadataFromFacetList,
  getStatVarMetadataFromFacets,
} from "../../shared/util";
import { ToolChartFooter } from "../shared/vis_tools/tool_chart_footer";
import { ToolChartHeader } from "../shared/vis_tools/tool_chart_header";
import { Context } from "./context";
import { D3Map } from "./d3_map";
import { getTitle } from "./util";

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
  rankingLink: string;
  facetList: FacetSelectorFacetInfo[];
  facetListLoading: boolean;
  facetListError: boolean;
  children: ReactNode;
  borderGeoJsonData?: GeoJsonData;
  // A function passed through from the chart that handles the task
  // of creating the embedding used in the download functionality.
  handleEmbed?: () => void;
  // A callback function passed through from the chart that will collate
  // a set of observation specs relevant to the chart. These
  // specs can be hydrated into API calls.
  getObservationSpecs?: () => ObservationSpec[];
  // A ref to the chart container element.
  containerRef?: RefObject<HTMLElement>;
}

export const MAP_CONTAINER_ID = "choropleth-map";
export const LEGEND_CONTAINER_ID = "choropleth-legend";
const DATE_RANGE_INFO_ID = "date-range-info";
const DATE_RANGE_INFO_TEXT_ID = "date-range-tooltip-text";
export const SECTION_CONTAINER_ID = "map-chart";

export function Chart(props: ChartProps): ReactElement {
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

  // Get stat var metadata to use in metadata modal
  const { statVarToFacets, statVarSpecs } = getStatVarMetadataFromFacets(
    props.facetList,
    { [statVar.value.dcid]: statVar.value.metahash },
    statVar.value.perCapita,
    props.unit,
    false // There is no log option for maps
  );

  // Calculate date ranges for each stat var to use in metadata modal
  const statVarDateRanges: Record<
    string,
    { minDate: string; maxDate: string }
  > = {};
  if (props.dates.size > 0) {
    const datesArr = Array.from(props.dates);
    let minDate = datesArr[0];
    let maxDate = datesArr[0];
    datesArr.forEach((date) => {
      if (date < minDate) minDate = date;
      if (date > maxDate) maxDate = date;
    });
    statVarDateRanges[statVar.value.dcid] = { minDate, maxDate };
  }

  return (
    <div className="chart-section-container">
      <ToolChartHeader
        svFacetId={{ [statVarDcid]: statVar.value.metahash }}
        facetList={props.facetList}
        onSvFacetIdUpdated={(svFacetId): void =>
          statVar.setMetahash(svFacetId[statVar.value.dcid])
        }
        facetListLoading={props.facetListLoading}
        facetListError={props.facetListError}
      />
      <Card className="chart-section-card">
        <Container id={SECTION_CONTAINER_ID} fluid={true}>
          <div id="map-chart-screen" className="screen">
            <div id="spinner"></div>
          </div>
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
                The date range represents the dates of the data shown in this
                map.
              </div>
            </div>
            <D3Map
              geoJsonData={props.geoJsonData}
              mapDataValues={props.mapDataValues}
              metadata={props.metadata}
              unit={props.unit}
              mapPointValues={props.mapPointValues}
              mapPoints={props.mapPoints}
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
        hidePerCapitaOption={!mainSvInfo.pcAllowed}
        isPerCapita={statVar.value.perCapita}
        onIsPerCapitaUpdated={(isPerCapita: boolean): void =>
          statVar.setPerCapita(isPerCapita)
        }
        handleEmbed={props.handleEmbed}
        getObservationSpecs={props.getObservationSpecs}
        containerRef={props.containerRef}
        facets={getFacetMetadataFromFacetList(props.facetList)}
        statVarSpecs={statVarSpecs}
        statVarToFacets={statVarToFacets}
        statVarDateRanges={statVarDateRanges}
      >
        {placeInfo.value.mapPointPlaceType && (
          <div className="chart-option">
            <FormGroup check>
              <Label check>
                <Input
                  id="show-installations"
                  type="checkbox"
                  checked={display.value.showMapPoints}
                  onChange={(e): void =>
                    display.setShowMapPoints(e.target.checked)
                  }
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

const onDateRangeMouseOver = (): void => {
  const offset = 20;
  const left =
    (d3.select(`#${DATE_RANGE_INFO_ID}`).node() as HTMLElement).offsetLeft +
    offset;
  d3.select(`#${DATE_RANGE_INFO_TEXT_ID}`)
    .style("left", left + "px")
    .style("visibility", "visible");
};

const onDateRangeMouseOut = (): void => {
  d3.select(`#${DATE_RANGE_INFO_TEXT_ID}`).style("visibility", "hidden");
};
