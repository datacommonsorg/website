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
 * Component for rendering a gauge tile.
 */

import axios from "axios";
import _ from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { drawGaugeChart } from "../../chart/draw";
import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import { formatNumber } from "../../i18n/i18n";
import { PointApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { stringifyFn } from "../../utils/axios";
import { dataPointsToCsv } from "../../utils/chart_csv_utils";
import { getStatVarNames, ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

export interface GaugeTilePropType {
  // API root
  apiRoot?: string;
  // colors to use
  colors?: string[];
  // ID of the tile
  id: string;
  // Min height, in px, for the SVG chart
  minSvgChartHeight: number;
  // Place to show data for
  place: NamedTypedPlace;
  // Range of values gauge should span
  range: {
    min: number;
    max: number;
  };
  // Variable to show data for
  statVarSpec: StatVarSpec;
  // Title at top of tile
  title: string;
}

export interface GaugeChartData {
  date: string;
  value: number;
  sources: Set<string>;
  statVar: string;
  range: {
    min: number;
    max: number;
  };
  statVarName: string;
  props: GaugeTilePropType;
}

export function GaugeTile(props: GaugeTilePropType): JSX.Element {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [gaugeData, setGaugeData] = useState<GaugeChartData | undefined>(null);

  useEffect(() => {
    // fetch data
    if (!gaugeData || !_.isEqual(gaugeData.props, props)) {
      (async () => {
        const data = await fetchData(props);
        setGaugeData(data);
      })();
    }
  }, [props, gaugeData]);

  const drawFn = useCallback(() => {
    // draw if data is available
    if (_.isEmpty(gaugeData)) {
      return;
    }
    draw(props, gaugeData, chartContainerRef.current);
  }, [props, gaugeData]);
  useDrawOnResize(drawFn, chartContainerRef.current);

  // replacement strings for formatting the title
  const replacementStrings: ReplacementStrings = {
    placeDcid: props.place.dcid,
    placeName: props.place.name,
    statVar: props.statVarSpec.statVar,
  };

  return (
    <ChartTileContainer
      id={props.id}
      title={props.title}
      sources={gaugeData && gaugeData.sources}
      replacementStrings={replacementStrings}
      allowEmbed={true}
      className={`bar-chart`}
      getDataCsv={
        gaugeData
          ? () =>
              dataPointsToCsv([
                { value: gaugeData.value, label: props.place.dcid },
              ])
          : null
      }
    >
      <div
        className={`svg-container ${ASYNC_ELEMENT_HOLDER_CLASS}`}
        style={{ minHeight: props.minSvgChartHeight }}
        ref={chartContainerRef}
      ></div>
    </ChartTileContainer>
  );
}

const fetchData = async (props: GaugeTilePropType) => {
  const mainStatVar = props.statVarSpec.statVar;
  const denomStatVar = props.statVarSpec.denom;
  const statVars = [mainStatVar];
  if (denomStatVar) {
    statVars.push(denomStatVar);
  }
  try {
    const resp = await axios.get<PointApiResponse>(
      `${props.apiRoot || ""}/api/observations/point`,
      {
        params: {
          entities: [props.place.dcid],
          variables: statVars,
        },
        paramsSerializer: stringifyFn,
      }
    );
    const statVarDcidToName = await getStatVarNames(
      [props.statVarSpec],
      props.apiRoot
    );

    const statData = resp.data.data;
    const mainStatData = statData[mainStatVar][props.place.dcid];
    let value = mainStatData.value;
    if (denomStatVar) {
      value /= statData[denomStatVar][props.place.dcid].value;
    }
    if (props.statVarSpec.scaling) {
      value *= props.statVarSpec.scaling;
    }
    const sources = new Set<string>();

    if (resp.data.facets[mainStatData.facet]) {
      sources.add(resp.data.facets[mainStatData.facet].provenanceUrl);
    }
    return {
      value,
      date: mainStatData.date,
      sources,
      statVar: mainStatVar,
      statVarName: statVarDcidToName[mainStatVar],
      range: props.range,
      props,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
};

function draw(
  props: GaugeTilePropType,
  chartData: GaugeChartData,
  svgContainer: HTMLDivElement
): void {
  drawGaugeChart(
    svgContainer,
    svgContainer.offsetWidth,
    chartData,
    formatNumber,
    props.minSvgChartHeight,
    {
      colors: props.colors,
    }
  );
}
