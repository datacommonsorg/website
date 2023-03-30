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
import React, { useCallback, useEffect, useRef, useState } from "react";

import { DataGroup, DataPoint } from "../../chart/base";
import { drawGroupBarChart } from "../../chart/draw";
import { formatNumber } from "../../i18n/i18n";
import { PointApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { RankingPoint } from "../../types/ranking_unit_types";
import { BarTileSpec } from "../../types/subject_page_proto_types";
import { stringifyFn } from "../../utils/axios";
import { dataGroupsToCsv } from "../../utils/chart_csv_utils";
import { getPlaceNames } from "../../utils/place_utils";
import { getUnit } from "../../utils/stat_metadata_utils";
import { getDateRange } from "../../utils/string_utils";
import { getStatVarName, ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

const NUM_PLACES = 7;

const FILTER_STAT_VAR = "Count_Person";
const DEFAULT_X_LABEL_LINK_ROOT = "/place/";

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
  // Tile spec with additional information about what to show on this tile
  tileSpec?: BarTileSpec;
}

interface BarChartData {
  dataGroup: DataGroup[];
  sources: Set<string>;
  unit: string;
  dateRange: string;
}

export function BarTile(props: BarTilePropType): JSX.Element {
  const chartContainerRef = useRef(null);
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

  const drawFn = useCallback(() => {
    if (_.isEmpty(barChartData)) {
      return;
    }
    draw(props, barChartData);
  }, [props, barChartData]);

  useDrawOnResize(drawFn, chartContainerRef.current);

  const rs: ReplacementStrings = {
    placeName: props.place ? props.place.name : "",
    date: barChartData && barChartData.dateRange,
  };
  return (
    <ChartTileContainer
      title={props.title}
      sources={barChartData && barChartData.sources}
      replacementStrings={rs}
      className={`${props.className} bar-chart`}
      allowEmbed={true}
      getDataCsv={
        barChartData ? () => dataGroupsToCsv(barChartData.dataGroup) : null
      }
      isInitialLoading={_.isNull(barChartData)}
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
        const specLinkRoot = props.tileSpec
          ? props.tileSpec.xLabelLinkRoot
          : "";
        const link = `${specLinkRoot || DEFAULT_X_LABEL_LINK_ROOT}${placeDcid}`;
        dataGroups.push(
          new DataGroup(placeNames[placeDcid] || placeDcid, dataPoints, link)
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
