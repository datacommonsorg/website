/**
 * Copyright 2023 Google LLC
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
 * Component for rendering a donut tile.
 */

import _ from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { DataGroup, DataPoint } from "../../chart/base";
import { drawDonutChart } from "../../chart/draw_donut";
import { PointApiResponse, SeriesApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { RankingPoint } from "../../types/ranking_unit_types";
import { dataGroupsToCsv } from "../../utils/chart_csv_utils";
import { getPoint, getSeries } from "../../utils/data_fetch_utils";
import { getPlaceNames } from "../../utils/place_utils";
import { getUnit } from "../../utils/stat_metadata_utils";
import { getDateRange } from "../../utils/string_utils";
import {
  getDenomInfo,
  getStatVarNames,
  getUnitAndScaling,
  ReplacementStrings,
} from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

const NUM_PLACES = 1000;

const FILTER_STAT_VAR = "Count_Person";
const DEFAULT_X_LABEL_LINK_ROOT = "/place/";

export interface DonutTilePropType {
  // API root
  apiRoot?: string;
  // Extra classes to add to the container.
  className?: string;
  // Colors to use
  colors?: string[];
  // Id for the chart
  id: string;
  // Whether to draw as full pie chart instead
  pie?: boolean;
  // The primary place of the page (disaster, topic, nl)
  place: NamedTypedPlace;
  // Stat vars to plot
  statVarSpec: StatVarSpec[];
  // Height, in px, for the SVG chart.
  svgChartHeight: number;
  // Title to put at top of chart
  title: string;
}

interface DonutChartData {
  dataGroup: DataGroup[];
  sources: Set<string>;
  unit: string;
  dateRange: string;
}

export function DonutTile(props: DonutTilePropType): JSX.Element {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [donutChartData, setDonutChartData] = useState<
    DonutChartData | undefined
  >(null);

  useEffect(() => {
    if (!donutChartData) {
      (async () => {
        const data = await fetchData(props);
        setDonutChartData(data);
      })();
    }
  }, [props, donutChartData]);

  const drawFn = useCallback(() => {
    if (_.isEmpty(donutChartData)) {
      return;
    }
    draw(props, donutChartData, chartContainerRef.current);
  }, [props, donutChartData]);

  useDrawOnResize(drawFn, chartContainerRef.current);

  return (
    <ChartTileContainer
      id={props.id}
      title={props.title}
      sources={donutChartData && donutChartData.sources}
      replacementStrings={getReplacementStrings(props, donutChartData)}
      className={`${props.className} bar-chart`}
      allowEmbed={true}
      getDataCsv={
        donutChartData ? () => dataGroupsToCsv(donutChartData.dataGroup) : null
      }
      isInitialLoading={_.isNull(donutChartData)}
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
  props: DonutTilePropType,
  chartData: DonutChartData
): ReplacementStrings {
  return {
    placeName: props.place ? props.place.name : "",
    date: chartData && chartData.dateRange,
  };
}

export const fetchData = async (props: DonutTilePropType) => {
  const statSvs = props.statVarSpec
    .map((spec) => spec.statVar)
    .filter((sv) => !!sv);
  const denomSvs = props.statVarSpec
    .map((spec) => spec.denom)
    .filter((sv) => !!sv);
  try {
    const statResp = await getPoint(
      props.apiRoot,
      [props.place.dcid],
      [statSvs, FILTER_STAT_VAR].flat(1),
      "",
      [statSvs]
    );
    const denomResp = _.isEmpty(denomSvs)
      ? null
      : await getSeries(props.apiRoot, [props.place.dcid], denomSvs);

    // Find the most populated places.
    let popPoints: RankingPoint[] = [];
    for (const place in statResp.data[FILTER_STAT_VAR]) {
      popPoints.push({
        placeDcid: place,
        value: statResp.data[FILTER_STAT_VAR][place].value,
      });
    }
    // Take the most populated places.
    popPoints.sort((a, b) => a.value - b.value);
    popPoints = popPoints.slice(0, NUM_PLACES);
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
      statResp,
      denomResp,
      popPoints,
      placeNames,
      statVarDcidToName
    );
  } catch (error) {
    console.log(error);
    return null;
  }
};

function rawToChart(
  props: DonutTilePropType,
  statData: PointApiResponse,
  denomData: SeriesApiResponse,
  popPoints: RankingPoint[],
  placeNames: Record<string, string>,
  statVarNames: Record<string, string>
): DonutChartData {
  const raw = _.cloneDeep(statData);
  const dataGroups: DataGroup[] = [];
  const sources = new Set<string>();

  const dates: Set<string> = new Set();
  // Assume all stat var specs will use the same unit and scaling.
  const { unit, scaling } = getUnitAndScaling(props.statVarSpec[0], statData);
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
    const link = `${DEFAULT_X_LABEL_LINK_ROOT}${placeDcid}`;
    dataGroups.push(
      new DataGroup(placeNames[placeDcid] || placeDcid, dataPoints, link)
    );
  }
  return {
    dataGroup: dataGroups,
    sources,
    dateRange: getDateRange(Array.from(dates)),
    unit,
  };
}

export function draw(
  props: DonutTilePropType,
  chartData: DonutChartData,
  svgContainer: HTMLDivElement,
  svgWidth?: number
): void {
  drawDonutChart(
    svgContainer,
    svgWidth || svgContainer.offsetWidth,
    props.svgChartHeight,
    chartData.dataGroup,
    props.pie,
    {
      colors: props.colors,
    }
  );
}
