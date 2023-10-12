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

import _ from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { ChartSortOption } from "@datacommonsorg/web-components";
import { VisType } from "../../apps/visualization/vis_type_configs";
import { DataGroup, DataPoint } from "../../chart/base";
import {
  drawGroupBarChart,
  drawHorizontalBarChart,
  drawStackBarChart,
} from "../../chart/draw_bar";
import { URL_PATH } from "../../constants/app/visualization_constants";
import { PLACE_TYPES } from "../../shared/constants";
import { PointApiResponse, SeriesApiResponse } from "../../shared/stat_types";
import { RankingPoint } from "../../types/ranking_unit_types";
import {
  getContextStatVar,
  getHash,
} from "../../utils/app/visualization_utils";
import { dataGroupsToCsv } from "../../utils/chart_csv_utils";
import {
  getPoint,
  getPointWithin,
  getSeries,
  getSeriesWithin,
} from "../../utils/data_fetch_utils";
import { getPlaceNames, getPlaceType } from "../../utils/place_utils";
import { getDateRange } from "../../utils/string_utils";
import {
  ReplacementStrings,
  getDenomInfo,
  getNoDataErrorMsg,
  getStatFormat,
  getStatVarNames,
  showError,
} from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import {
  ChartOptions,
  MultiOrContainedInPlaceMultiVariableTileType,
} from "./tile_types";
import { useDrawOnResize } from "./use_draw_on_resize";

const NUM_PLACES = 7;

const FILTER_STAT_VAR = "Count_Person";
const DEFAULT_X_LABEL_LINK_ROOT = "/browser/";
const PLACE_X_LABEL_LINK_ROOT = "/place/";

interface BarTileSpecificSpec {
  // Bar height for horizontal bar charts
  barHeight?: number;
  // Function used to get processed stat var names.
  getProcessedSVNameFn?: (name: string) => string;
  // Whether to plot bars horizontally
  horizontal?: boolean;
  // Maximum number of places to display
  maxPlaces?: number;
  // Maximum number of variables to display
  maxVariables?: number;
  // The property to use to get place names.
  placeNameProp?: string;
  // Set to true to draw tooltip when hovering over bars
  showTooltipOnHover?: boolean;
  // sort order
  sort?: ChartSortOption;
  // Set to true to draw as a stacked chart instead of a grouped chart
  stacked?: boolean;
  // Whether to draw as a lollipop chart instead
  useLollipop?: boolean;
  // path root for clickable place label links, e.g. "/browser/" or "/place/"
  xLabelLinkRoot?: string;
  // Y-axis margin / text width
  yAxisMargin?: number;
}

export type BarTilePropType = MultiOrContainedInPlaceMultiVariableTileType &
  ChartOptions &
  BarTileSpecificSpec;

export interface BarChartData {
  dataGroup: DataGroup[];
  sources: Set<string>;
  unit: string;
  dateRange: string;
  props: BarTilePropType;
  statVarOrder: string[];
  errorMsg: string;
  // name of place, used for title replacement strings
  placeName?: string;
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
      subtitle={props.subtitle}
      sources={barChartData && barChartData.sources}
      replacementStrings={getReplacementStrings(barChartData)}
      className={`${props.className} bar-chart`}
      allowEmbed={true}
      getDataCsv={
        barChartData ? () => dataGroupsToCsv(barChartData.dataGroup) : null
      }
      isInitialLoading={_.isNull(barChartData)}
      exploreLink={props.showExploreMore ? getExploreLink(props) : null}
      hasErrorMsg={barChartData && !!barChartData.errorMsg}
      footnote={props.footnote}
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
  chartData: BarChartData,
  placeName?: string
): ReplacementStrings {
  return {
    placeName: placeName || "",
    date: chartData && chartData.dateRange,
  };
}

export const fetchData = async (props: BarTilePropType) => {
  const statSvs = props.variables
    .map((spec) => spec.statVar)
    .filter((sv) => !!sv);
  const denomSvs = props.variables
    .map((spec) => spec.denom)
    .filter((sv) => !!sv);
  const statVars = [statSvs, FILTER_STAT_VAR].flat(1);
  const apiRoot = props.apiRoot || "";
  let statPromise: Promise<PointApiResponse>;
  let denomPromise: Promise<SeriesApiResponse>;
  if ("places" in props && !_.isEmpty(props.places)) {
    statPromise = getPoint(apiRoot, props.places, statVars, "", [statSvs]);
    denomPromise = _.isEmpty(denomSvs)
      ? Promise.resolve(null)
      : getSeries(apiRoot, props.places, denomSvs);
  } else if ("enclosedPlaceType" in props && "parentPlace" in props) {
    statPromise = getPointWithin(
      apiRoot,
      props["enclosedPlaceType"],
      props["parentPlace"],
      statVars,
      "",
      [statSvs]
    );
    denomPromise = _.isEmpty(denomSvs)
      ? Promise.resolve(null)
      : getSeriesWithin(
          apiRoot,
          props["parentPlaces"],
          props["enclosedPlaceType"],
          denomSvs
        );
  }
  try {
    const statResp = await statPromise;
    const denomResp = await denomPromise;
    // Find the most populated places.
    const popPoints: RankingPoint[] = [];
    // Non-place entities won't have a value for Count_Person.
    // In this case, make an empty list of popPoints
    if (_.isEmpty(statResp.data[FILTER_STAT_VAR])) {
      const entityDcidsSet = new Set<string>();
      Object.keys(statResp.data).forEach((statVarKey) => {
        Object.keys(statResp.data[statVarKey]).forEach((entityDcid) => {
          entityDcidsSet.add(entityDcid);
        });
      });
      entityDcidsSet.forEach((entityDcid) => {
        popPoints.push({
          placeDcid: entityDcid,
          value: undefined,
        });
      });
    }
    for (const place in statResp.data[FILTER_STAT_VAR]) {
      popPoints.push({
        placeDcid: place,
        value: statResp.data[FILTER_STAT_VAR][place].value,
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
      props.apiRoot,
      props.placeNameProp
    );
    const placeType =
      "enclosedPlaceType" in props
        ? props.enclosedPlaceType
        : await getPlaceType(
            Array.from(popPoints)
              .map((x) => x.placeDcid)
              .pop(),
            props.apiRoot
          );
    const statVarDcidToName = await getStatVarNames(
      props.variables,
      props.apiRoot,
      props.getProcessedSVNameFn
    );
    return rawToChart(
      props,
      statResp,
      denomResp,
      popPoints,
      placeNames,
      placeType,
      statVarDcidToName
    );
  } catch (error) {
    console.log(error);
    return null;
  }
};

function rawToChart(
  props: BarTilePropType,
  statData: PointApiResponse,
  denomData: SeriesApiResponse,
  popPoints: RankingPoint[],
  placeNames: Record<string, string>,
  placeType: string,
  statVarNames: Record<string, string>
): BarChartData {
  const raw = _.cloneDeep(statData);
  const dataGroups: DataGroup[] = [];
  const sources = new Set<string>();
  // Track original order of stat vars in props, to maintain 1:1 pairing of
  // colors to stat var labels even after sorting
  const statVarOrder = props.variables.map(
    (spec) => statVarNames[spec.statVar]
  );
  // Assume all stat var specs will use the same unit and scaling.
  const { unit, scaling } = getStatFormat(props.variables[0], statData);
  const dates: Set<string> = new Set();
  for (const point of popPoints) {
    const placeDcid = point.placeDcid;
    const dataPoints: DataPoint[] = [];
    for (const spec of props.variables) {
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
      }
      if (spec.denom) {
        const denomInfo = getDenomInfo(spec, denomData, placeDcid, stat.date);
        if (!denomInfo) {
          // skip this data point because missing denom data.
          continue;
        }
        dataPoint.value /= denomInfo.value;
        sources.add(denomInfo.source);
      }
      if (scaling) {
        dataPoint.value *= scaling;
      }
      dataPoints.push(dataPoint);
    }
    const apiRoot = (props.apiRoot || "").replace(/\/$/, "");
    const urlPath =
      props.xLabelLinkRoot ||
      (PLACE_TYPES.has(placeType)
        ? PLACE_X_LABEL_LINK_ROOT
        : DEFAULT_X_LABEL_LINK_ROOT);
    const link = `${apiRoot}${urlPath}${placeDcid}`;
    if (!_.isEmpty(dataPoints)) {
      // Only add to dataGroups if data is present
      dataGroups.push(
        new DataGroup(placeNames[placeDcid] || placeDcid, dataPoints, link)
      );
    }
  }
  // Optionally sort ascending/descending by value
  if (props.sort === "ascending" || props.sort === "descending") {
    if (props.variables.length == 1) {
      // if only one variable, sort by places
      dataGroups.sort(function (a, b): number {
        if (!_.isEmpty(a.value) && !_.isEmpty(b.value)) {
          return (
            (a.value[0].value - b.value[0].value) *
            (props.sort === "ascending" ? 1 : -1)
          );
        }
        return 0;
      });
    } else if (!_.isEmpty(dataGroups)) {
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
  }

  if (props.maxVariables) {
    dataGroups.forEach((dataGroup) => {
      dataGroup.value = dataGroup.value.slice(0, props.maxVariables);
    });
  }
  const errorMsg = _.isEmpty(dataGroups)
    ? getNoDataErrorMsg(props.variables)
    : "";
  let placeName = "";
  if ("parentPlace" in props) {
    placeName = placeNames[props.parentPlace];
  } else if ("places" in props && props.places.length == 1) {
    placeName = placeNames[props.places[0]];
  }

  return {
    dataGroup: dataGroups.slice(0, props.maxPlaces || NUM_PLACES),
    sources,
    dateRange: getDateRange(Array.from(dates)),
    unit,
    props,
    statVarOrder,
    errorMsg,
    placeName,
  };
}

export function draw(
  props: BarTilePropType,
  chartData: BarChartData,
  svgContainer: HTMLDivElement,
  svgWidth?: number,
  useSvgLegend?: boolean
): void {
  if (chartData.errorMsg) {
    showError(chartData.errorMsg, svgContainer);
    return;
  }
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
        useSvgLegend,
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
          useSvgLegend,
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
          useSvgLegend,
        }
      );
    }
  }
}

function getExploreLink(props: BarTilePropType): {
  displayText: string;
  url: string;
} {
  const placeDcids =
    "places" in props
      ? props.places
      : "parentPlace" in props
      ? [props.parentPlace]
      : [];
  const hash = getHash(
    VisType.TIMELINE,
    placeDcids,
    "",
    props.variables.map((spec) => getContextStatVar(spec)),
    {}
  );
  return {
    displayText: "Timeline Tool",
    url: `${props.apiRoot || ""}${URL_PATH}#${hash}`,
  };
}
