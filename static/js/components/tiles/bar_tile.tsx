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
 * Component for rendering a bar tile.
 */

import axios from "axios";
import * as d3 from "d3";
import _ from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { VisType } from "../../apps/visualization/vis_type_configs";
import { DataGroup, DataPoint } from "../../chart/base";
import {
  drawGroupBarChart,
  drawHorizontalBarChart,
  drawStackBarChart,
} from "../../chart/draw_bar";
import { SortType } from "../../chart/types";
import { URL_PATH } from "../../constants/app/visualization_constants";
import { PointApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { RankingPoint } from "../../types/ranking_unit_types";
import { BarTileSpec } from "../../types/subject_page_proto_types";
import {
  getContextStatVar,
  getHash,
} from "../../utils/app/visualization_utils";
import { stringifyFn } from "../../utils/axios";
import { dataGroupsToCsv } from "../../utils/chart_csv_utils";
import { getPlaceNames } from "../../utils/place_utils";
import { getUnit } from "../../utils/stat_metadata_utils";
import { getDateRange } from "../../utils/string_utils";
import { getStatVarNames, ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

const NUM_PLACES = 7;

const FILTER_STAT_VAR = "Count_Person";
const DEFAULT_X_LABEL_LINK_ROOT = "/place/";

// TODO (juliawu): Refactor the "optional" specs into BarTileSpec. This will
//                 also allow BarTilePropType to match the structure of the
//                 subject page protos.
export interface BarTilePropType {
  // API root
  apiRoot?: string;
  // Bar height for horizontal bar charts
  barHeight?: number;
  // Extra classes to add to the container.
  className?: string;
  // A list of related places to show comparison with the main place.
  comparisonPlaces: string[];
  // A list of specific colors to use
  colors?: string[];
  enclosedPlaceType: string;
  horizontal?: boolean;
  id: string;
  // Maximum number of places to display
  maxPlaces?: number;
  // Maximum number of variables to display
  maxVariables?: number;
  // The primary place of the page (disaster, topic, nl)
  place: NamedTypedPlace;
  // sort order
  sort?: SortType;
  // Set to true to draw tooltip when hovering over bars
  showTooltipOnHover?: boolean;
  // Set to true to draw as a stacked chart instead of a grouped chart
  stacked?: boolean;
  statVarSpec: StatVarSpec[];
  // Height, in px, for the SVG chart.
  svgChartHeight: number;
  title: string;
  // Tile spec with additional information about what to show on this tile
  tileSpec?: BarTileSpec;
  // Whether to draw as a lollipop chart instead
  useLollipop?: boolean;
  // Y-axis margin / text width
  yAxisMargin?: number;
  // Whether or not to show the explore more button.
  showExploreMore?: boolean;
}

export interface BarChartData {
  dataGroup: DataGroup[];
  sources: Set<string>;
  unit: string;
  dateRange: string;
  props: BarTilePropType;
  statVarOrder: string[];
}

export function BarTile(props: BarTilePropType): JSX.Element {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [barChartData, setBarChartData] = useState<BarChartData | undefined>(
    null
  );

  useEffect(() => {
    if (!barChartData || !_.isEqual(barChartData.props, props)) {
      (async () => {
        const data = await fetchData(props);
        setBarChartData(data);
      })();
    }
  }, [props, barChartData]);

  const drawFn = useCallback(() => {
    if (_.isEmpty(barChartData)) {
      return;
    }
    draw(props, barChartData, chartContainerRef.current);
  }, [props, barChartData]);

  useDrawOnResize(drawFn, chartContainerRef.current);

  return (
    <ChartTileContainer
      id={props.id}
      title={props.title}
      sources={barChartData && barChartData.sources}
      replacementStrings={getReplacementStrings(props, barChartData)}
      className={`${props.className} bar-chart`}
      allowEmbed={true}
      getDataCsv={
        barChartData ? () => dataGroupsToCsv(barChartData.dataGroup) : null
      }
      isInitialLoading={_.isNull(barChartData)}
      exploreLink={props.showExploreMore ? getExploreLink(props) : null}
    >
      <div
        id={props.id}
        className="svg-container"
        style={{ minHeight: props.svgChartHeight }}
        ref={chartContainerRef}
      ></div>
    </ChartTileContainer>
  );
}

// Get the ReplacementStrings object used for formatting the title
export function getReplacementStrings(
  props: BarTilePropType,
  chartData: BarChartData
): ReplacementStrings {
  return {
    placeName: props.place ? props.place.name : "",
    date: chartData && chartData.dateRange,
  };
}

export const fetchData = async (props: BarTilePropType) => {
  const statVars = [];
  for (const spec of props.statVarSpec) {
    statVars.push(spec.statVar);
    if (spec.denom) {
      statVars.push(spec.denom);
    }
  }
  // Fetch populations.
  statVars.push(FILTER_STAT_VAR);
  let url: string;
  let params;
  if (!_.isEmpty(props.comparisonPlaces)) {
    url = `${props.apiRoot || ""}/api/observations/point`;
    params = {
      entities: props.comparisonPlaces,
      variables: statVars,
    };
  } else {
    url = `${props.apiRoot || ""}/api/observations/point/within`;
    params = {
      parentEntity: props.place.dcid,
      childType: props.enclosedPlaceType,
      variables: statVars,
    };
  }
  try {
    const resp = await axios.get<PointApiResponse>(url, {
      params,
      paramsSerializer: stringifyFn,
    });

    // Find the most populated places.
    const popPoints: RankingPoint[] = [];
    for (const place in resp.data.data[FILTER_STAT_VAR]) {
      popPoints.push({
        placeDcid: place,
        value: resp.data.data[FILTER_STAT_VAR][place].value,
      });
    }
    // Optionally sort by ascending/descending population
    if (!props.sort || props.sort === "descendingPopulation") {
      popPoints.sort((a, b) => b.value - a.value);
    } else if (props.sort === "ascendingPopulation") {
      popPoints.sort((a, b) => a.value - b.value);
    }

    const placeNames = await getPlaceNames(
      Array.from(popPoints).map((x) => x.placeDcid),
      props.apiRoot
    );
    const statVarDcidToName = await getStatVarNames(
      props.statVarSpec,
      props.apiRoot
    );
    return rawToChart(
      props,
      resp.data,
      popPoints,
      placeNames,
      statVarDcidToName
    );
  } catch (error) {
    return null;
  }
};

function rawToChart(
  props: BarTilePropType,
  rawData: PointApiResponse,
  popPoints: RankingPoint[],
  placeNames: Record<string, string>,
  statVarNames: Record<string, string>
): BarChartData {
  const raw = _.cloneDeep(rawData);
  const dataGroups: DataGroup[] = [];
  const sources = new Set<string>();
  // Track original order of stat vars in props, to maintain 1:1 pairing of
  // colors to stat var labels even after sorting
  const statVarOrder = props.statVarSpec.map(
    (spec) => statVarNames[spec.statVar]
  );

  let unit = "";
  const dates: Set<string> = new Set();
  for (const point of popPoints) {
    const placeDcid = point.placeDcid;
    const dataPoints: DataPoint[] = [];
    for (const spec of props.statVarSpec) {
      const statVar = spec.statVar;
      if (!raw.data[statVar] || _.isEmpty(raw.data[statVar][placeDcid])) {
        continue;
      }
      const stat = raw.data[statVar][placeDcid];
      const dataPoint = {
        label: statVarNames[statVar],
        value: stat.value || 0,
        dcid: placeDcid,
        date: stat.date,
      };
      dates.add(stat.date);
      if (raw.facets[stat.facet]) {
        sources.add(raw.facets[stat.facet].provenanceUrl);
        const svUnit = getUnit(raw.facets[stat.facet]);
        unit = unit || svUnit;
      }
      if (spec.denom && spec.denom in raw.data) {
        const denomStat = raw.data[spec.denom][placeDcid];
        dataPoint.value /= denomStat.value;
        sources.add(raw.facets[denomStat.facet].provenanceUrl);
      }
      if (spec.scaling) {
        dataPoint.value *= spec.scaling;
      }
      dataPoints.push(dataPoint);
    }
    const specLinkRoot = props.tileSpec ? props.tileSpec.xLabelLinkRoot : "";
    const link = `${specLinkRoot || DEFAULT_X_LABEL_LINK_ROOT}${placeDcid}`;
    if (!_.isEmpty(dataPoints)) {
      // Only add to dataGroups if data is present
      dataGroups.push(
        new DataGroup(placeNames[placeDcid] || placeDcid, dataPoints, link)
      );
    }
  }
  if (!_.isEmpty(props.statVarSpec)) {
    unit = props.statVarSpec[0].unit || unit;
  }
  // Optionally sort ascending/descending by value
  if (props.sort === "ascending" || props.sort === "descending") {
    // sort variables in first group by value
    dataGroups[0].value.sort(
      (a, b) => (a.value - b.value) * (props.sort === "ascending" ? 1 : -1)
    );

    // use order of first group for all other groups
    if (dataGroups.length > 1) {
      const firstGroupLabels = dataGroups[0].value.map((dp) => dp.label);
      dataGroups.slice(1).forEach((dataGroup) => {
        dataGroup.value.sort(
          (a, b) =>
            firstGroupLabels.indexOf(a.label) -
            firstGroupLabels.indexOf(b.label)
        );
      });
    }
  }

  if (props.maxVariables) {
    dataGroups.forEach((dataGroup) => {
      dataGroup.value = dataGroup.value.slice(0, props.maxVariables);
    });
  }

  return {
    dataGroup: dataGroups.slice(0, props.maxPlaces || NUM_PLACES),
    sources,
    dateRange: getDateRange(Array.from(dates)),
    unit,
    props,
    statVarOrder,
  };
}

export function draw(
  props: BarTilePropType,
  chartData: BarChartData,
  svgContainer: HTMLDivElement,
  svgWidth?: number
): void {
  if (props.horizontal) {
    drawHorizontalBarChart(
      svgContainer,
      svgWidth || svgContainer.offsetWidth,
      chartData.dataGroup,
      {
        colors: props.colors,
        lollipop: props.useLollipop,
        stacked: props.stacked,
        showTooltipOnHover: props.showTooltipOnHover,
        statVarColorOrder: chartData.statVarOrder,
        style: {
          barHeight: props.barHeight,
          yAxisMargin: props.yAxisMargin,
        },
        unit: chartData.unit,
      }
    );
  } else {
    if (props.stacked) {
      drawStackBarChart(
        svgContainer,
        props.id,
        svgWidth || svgContainer.offsetWidth,
        props.svgChartHeight,
        chartData.dataGroup,
        {
          colors: props.colors,
          lollipop: props.useLollipop,
          showTooltipOnHover: props.showTooltipOnHover,
          statVarColorOrder: chartData.statVarOrder,
          unit: chartData.unit,
        }
      );
    } else {
      drawGroupBarChart(
        svgContainer,
        props.id,
        svgWidth || svgContainer.offsetWidth,
        props.svgChartHeight,
        chartData.dataGroup,
        {
          colors: props.colors,
          lollipop: props.useLollipop,
          showTooltipOnHover: props.showTooltipOnHover,
          statVarColorOrder: chartData.statVarOrder,
          unit: chartData.unit,
        }
      );
    }
  }
}

function getExploreLink(props: BarTilePropType): {
  displayText: string;
  url: string;
} {
  const hash = getHash(
    VisType.TIMELINE,
    [...props.comparisonPlaces, props.place.dcid],
    "",
    props.statVarSpec.map((spec) => getContextStatVar(spec)),
    {}
  );
  return {
    displayText: "Timeline Tool",
    url: `${props.apiRoot || ""}${URL_PATH}#${hash}`,
  };
}
