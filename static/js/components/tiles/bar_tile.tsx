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
import _ from "lodash";
import React, { useEffect, useState } from "react";

import { DataGroup, DataPoint } from "../../chart/base";
import { drawGroupBarChart } from "../../chart/draw";
import { PointApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { RankingPoint } from "../../types/ranking_unit_types";
import { stringifyFn } from "../../utils/axios";
import { dataGroupsToCsv } from "../../utils/chart_csv_utils";
import { getPlaceNames } from "../../utils/place_utils";
import { formatNumber, getDateRange } from "../../utils/string_utils";
import {
  getStatVarName,
  getUnitString,
  ReplacementStrings,
} from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";

const NUM_PLACES = 6;

const FILTER_STAT_VAR = "Count_Person";

interface BarTilePropType {
  id: string;
  title: string;
  // The primary place of the page (disaster, topic, nl)
  place: NamedTypedPlace;
  // A list of related places to show comparison with the main place.
  comparisonPlaces: string[];
  enclosedPlaceType: string;
  statVarSpec: StatVarSpec[];
  // Height, in px, for the SVG chart.
  svgChartHeight: number;
  // Extra classes to add to the container.
  className?: string;
}

interface BarChartData {
  dataGroup: DataGroup[];
  sources: Set<string>;
  unit: string;
  dateRange: string;
}

export function BarTile(props: BarTilePropType): JSX.Element {
  const [rawData, setRawData] = useState<PointApiResponse | undefined>(null);
  const [barChartData, setBarChartData] = useState<BarChartData | undefined>(
    null
  );

  useEffect(() => {
    fetchData(props, setRawData);
  }, [props]);

  useEffect(() => {
    if (rawData) {
      processData(props, rawData, setBarChartData);
    }
  }, [props, rawData]);

  useEffect(() => {
    if (barChartData) {
      draw(props, barChartData);
    }
  }, [props, barChartData]);

  if (!barChartData) {
    return null;
  }
  const rs: ReplacementStrings = {
    place: props.place ? props.place.name : "",
    date: barChartData.dateRange
  };
  return (
    <ChartTileContainer
      title={props.title}
      sources={barChartData.sources}
      replacementStrings={rs}
      className={`${props.className} bar-chart`}
      allowEmbed={true}
      getDataCsv={() => dataGroupsToCsv(barChartData.dataGroup)}
    >
      <div id={props.id} className="svg-container"></div>
    </ChartTileContainer>
  );
}

function fetchData(
  props: BarTilePropType,
  setRawData: (data: PointApiResponse) => void
): void {
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
  if (props.comparisonPlaces) {
    url = "/api/observations/point";
    params = {
      entities: props.comparisonPlaces,
      variables: statVars,
    };
  } else {
    url = "/api/observations/point/within";
    params = {
      parent_entity: props.place.dcid,
      child_type: props.enclosedPlaceType,
      variables: statVars,
    };
  }
  axios
    .get<PointApiResponse>(url, {
      params: params,
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      setRawData(resp.data);
    })
    .catch(() => {
      setRawData(null);
    });
}

function processData(
  props: BarTilePropType,
  rawData: PointApiResponse,
  setBarChartData: (data: BarChartData) => void
): void {
  const raw = _.cloneDeep(rawData);
  const dataGroups: DataGroup[] = [];
  const sources = new Set<string>();

  // Find the most populated places.
  let popPoints: RankingPoint[] = [];
  for (const place in raw.data[FILTER_STAT_VAR]) {
    popPoints.push({
      placeDcid: place,
      value: raw.data[FILTER_STAT_VAR][place].value,
    });
  }
  // Take the most populated places.
  popPoints.sort((a, b) => a.value - b.value);
  popPoints = popPoints.slice(0, NUM_PLACES);

  // Fetch the place names
  getPlaceNames(Array.from(popPoints).map((x) => x.placeDcid)).then(
    (placeNames) => {
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
            label: getStatVarName(statVar, props.statVarSpec),
            value: stat.value || 0,
            dcid: placeDcid,
          };
          dates.add(stat.date);
          if (raw.facets[stat.facet]) {
            sources.add(raw.facets[stat.facet].provenanceUrl);
            const svUnit = getUnitString(
              raw.facets[stat.facet].unit,
              spec.denom
            );
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
        dataGroups.push(
          new DataGroup(placeNames[placeDcid] || placeDcid, dataPoints)
        );
      }
      if (!_.isEmpty(props.statVarSpec)) {
        unit = props.statVarSpec[0].unit || unit;
      }
      setBarChartData({
        dataGroup: dataGroups,
        sources: sources,
        dateRange: getDateRange(Array.from(dates)),
        unit,
      });
    }
  );
}

function draw(props: BarTilePropType, chartData: BarChartData): void {
  const elem = document.getElementById(props.id);
  // TODO: Remove all cases of setting innerHTML directly.
  elem.innerHTML = "";
  drawGroupBarChart(
    props.id,
    elem.offsetWidth,
    props.svgChartHeight,
    chartData.dataGroup,
    formatNumber,
    chartData.unit
  );
}
