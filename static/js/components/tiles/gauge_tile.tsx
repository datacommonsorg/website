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

import _ from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { drawGaugeChart } from "../../chart/draw_gauge";
import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import { CSV_FIELD_DELIMITER } from "../../constants/tile_constants";
import { useLazyLoad } from "../../shared/hooks";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { getDataCommonsClient } from "../../utils/data_commons_client";
import { getPoint, getSeries } from "../../utils/data_fetch_utils";
import {
  getDenomInfo,
  getNoDataErrorMsg,
  getStatFormat,
  getStatVarNames,
  ReplacementStrings,
  showError,
  transformCsvHeader,
} from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

export interface GaugeTilePropType {
  // API root
  apiRoot?: string;
  // colors to use
  colors?: string[];
  // Text to show in footer
  footnote?: string;
  // ID of the tile
  id: string;
  // Place to show data for
  place: NamedTypedPlace;
  // Range of values gauge should span
  range: {
    min: number;
    max: number;
  };
  // Variable to show data for
  statVarSpec: StatVarSpec;
  // Specific height, in px, for the SVG chart
  svgChartHeight: number;
  // Title at top of tile
  title: string;
  // Chart subtitle
  subtitle?: string;
  // Optional: Override sources for this tile
  sources?: string[];
  // Optional: only load this component when it's near the viewport
  lazyLoad?: boolean;
  /**
   * Optional: If lazy loading is enabled, load the component when it is within
   * this margin of the viewport. Default: "0px"
   */
  lazyLoadMargin?: string;
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
  errorMsg: string;
}

export function GaugeTile(props: GaugeTilePropType): JSX.Element {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [gaugeData, setGaugeData] = useState<GaugeChartData | undefined>(null);
  const { shouldLoad, containerRef } = useLazyLoad(props.lazyLoadMargin);
  useEffect(() => {
    if (props.lazyLoad && !shouldLoad) {
      return;
    }
    // fetch data
    if (!gaugeData || !_.isEqual(gaugeData.props, props)) {
      (async () => {
        const data = await fetchData(props);
        setGaugeData(data);
      })();
    }
  }, [props, gaugeData, shouldLoad]);

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
      subtitle={props.subtitle}
      apiRoot={props.apiRoot}
      sources={props.sources || (gaugeData && gaugeData.sources)}
      replacementStrings={replacementStrings}
      allowEmbed={true}
      className={`bar-chart`}
      getDataCsv={getDataCsvCallback(props)}
      hasErrorMsg={gaugeData && !!gaugeData.errorMsg}
      footnote={props.footnote}
      statVarSpecs={[props.statVarSpec]}
      forwardRef={containerRef}
    >
      <div
        className={`svg-container ${ASYNC_ELEMENT_HOLDER_CLASS}`}
        style={{ minHeight: props.svgChartHeight }}
        ref={chartContainerRef}
      ></div>
    </ChartTileContainer>
  );
}

const fetchData = async (props: GaugeTilePropType) => {
  try {
    const statResp = await getPoint(
      props.apiRoot,
      [props.place.dcid],
      [props.statVarSpec.statVar],
      ""
    );
    const denomResp = props.statVarSpec.denom
      ? await getSeries(
          props.apiRoot,
          [props.place.dcid],
          [props.statVarSpec.denom]
        )
      : null;
    const statVarDcidToName = await getStatVarNames(
      [props.statVarSpec],
      props.apiRoot
    );

    const { unit, scaling } = getStatFormat(props.statVarSpec, statResp);
    const sources = new Set<string>();
    const statData = statResp.data[props.statVarSpec.statVar][props.place.dcid];
    if (statResp.facets[statData.facet]) {
      sources.add(statResp.facets[statData.facet].provenanceUrl);
    }
    let value = statData.value;
    if (props.statVarSpec.denom) {
      const denomInfo = getDenomInfo(
        props.statVarSpec,
        denomResp,
        props.place.dcid,
        statData.date
      );
      if (denomInfo && value) {
        value /= denomInfo.value;
        sources.add(denomInfo.source);
      } else {
        value = null;
      }
    }
    if (value && scaling) {
      value *= scaling;
    }
    const errorMsg =
      _.isNull(value) || _.isUndefined(value)
        ? getNoDataErrorMsg([props.statVarSpec])
        : "";
    return {
      value,
      date: statData.date,
      sources,
      statVar: props.statVarSpec.statVar,
      statVarName: statVarDcidToName[props.statVarSpec.statVar],
      range: props.range,
      props,
      errorMsg,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
};

/**
 * Returns callback for fetching chart CSV data
 * @param props Chart properties
 * @returns Async function for fetching chart CSV
 */
function getDataCsvCallback(props: GaugeTilePropType): () => Promise<string> {
  const dataCommonsClient = getDataCommonsClient(props.apiRoot);
  return () => {
    return dataCommonsClient.getCsv({
      date: props.statVarSpec.date,
      entities: [props.place.dcid],
      fieldDelimiter: CSV_FIELD_DELIMITER,
      perCapitaVariables: props.statVarSpec.denom
        ? [props.statVarSpec.denom]
        : undefined,
      transformHeader: transformCsvHeader,
      variables: [props.statVarSpec.statVar],
    });
  };
}

function draw(
  props: GaugeTilePropType,
  chartData: GaugeChartData,
  svgContainer: HTMLDivElement
): void {
  if (chartData.errorMsg) {
    showError(chartData.errorMsg, svgContainer);
    return;
  }
  drawGaugeChart(
    svgContainer,
    svgContainer.offsetWidth,
    props.svgChartHeight,
    chartData,
    {
      colors: props.colors,
    }
  );
}
