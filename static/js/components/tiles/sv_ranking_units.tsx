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
 * Component for rendering a ranking tile.
 */
import * as d3 from "d3";
import _ from "lodash";
import React, { useEffect, useRef } from "react";

import { DATA_CSS_CLASS } from "../../constants/tile_constants";
import { formatNumber } from "../../i18n/i18n";
import { RankingData, RankingPoint } from "../../types/ranking_unit_types";
import { RankingTileSpec } from "../../types/subject_page_proto_types";
import {
  dataPointsToCsv,
  rankingPointsToCsv,
} from "../../utils/chart_csv_utils";
import { formatString } from "../../utils/tile_utils";
import { RankingUnit } from "../ranking_unit";
import { ChartFooter } from "./chart_footer";

const SVGNS = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";
const CHART_PADDING = 10;

interface SvRankingUnitsProps {
  isMultiColumn?: boolean;
  rankingCount: number;
  rankingData: RankingData;
  rankingMetadata: RankingTileSpec;
  showChartEmbed: (
    chartWidth: number,
    chartHeight: number,
    chartHtml: string,
    rankingPoints: RankingPoint[],
    sources: string[]
  ) => void;
  statVar: string;
  svName: string;
  svNames?: string[];
  title?: string;
  // Whether or not to render the data version of these units
  isDataTile?: boolean;
}

/**
 * Ranking unit tables for a stat var.
 * @param props SvRankingUnitsProps
 */
export function SvRankingUnits(props: SvRankingUnitsProps): JSX.Element {
  const {
    isMultiColumn,
    rankingCount,
    rankingData,
    rankingMetadata,
    showChartEmbed,
    statVar,
    svName,
    svNames,
    title,
  } = props;
  const { dateRange, numDataPoints, points, scaling, sources, unit } =
    rankingData[statVar];
  const { highestTitle, lowestTitle, showHighest, showLowest } =
    rankingMetadata;
  const highestRankingUnitRef = useRef<HTMLDivElement>();
  const lowestRankingUnitRef = useRef<HTMLDivElement>();

  /**
   * Build content and triggers export modal window
   */
  function handleEmbed(
    rankingPoints: RankingPoint[],
    sources: Set<string>,
    isHighest: boolean
  ): void {
    let chartHtml = "";
    let chartHeight = 0;
    let chartWidth = 0;
    const divEl = isHighest
      ? highestRankingUnitRef.current
      : lowestRankingUnitRef.current;
    if (divEl) {
      chartHtml = divEl.outerHTML;
      chartHeight = divEl.offsetHeight;
      chartWidth = divEl.offsetWidth;
    }
    showChartEmbed(
      chartWidth,
      chartHeight,
      chartHtml,
      rankingPoints,
      Array.from(sources)
    );
  }

  // Generates an svg from an html div element and attaches it to the tile data
  // as a data-svg attribute.
  function addSvgDataAttribute(
    chartDiv: HTMLDivElement,
    dataContainerClass: string
  ): void {
    const svg = d3
      .create("svg")
      .attr("xmlns", SVGNS)
      .attr("xmlns:xlink", XLINKNS)
      .attr("width", chartDiv.offsetWidth);

    svg
      .append("g")
      .attr("transform", `translate(${CHART_PADDING})`)
      .append("svg")
      .append("foreignObject")
      .attr("width", chartDiv.offsetWidth)
      .attr("height", chartDiv.offsetHeight)
      .style("font-family", "sans-serif")
      .append("xhtml:div")
      .html(chartDiv.outerHTML);

    const s = new XMLSerializer();
    const svgXml = s.serializeToString(svg.node());
    const dataContainer = document.getElementsByClassName(dataContainerClass);
    if (_.isEmpty(dataContainer)) {
      return;
    }
    const dataDiv = dataContainer[0].getElementsByClassName(DATA_CSS_CLASS);
    if (_.isEmpty(dataDiv)) {
      return;
    }
    dataDiv[0].setAttribute("data-svg", svgXml);
  }

  useEffect(() => {
    if (!props.isDataTile) {
      return;
    }
    if (highestRankingUnitRef.current) {
      addSvgDataAttribute(
        highestRankingUnitRef.current,
        "highest-ranking-container"
      );
    }
    if (lowestRankingUnitRef.current) {
      addSvgDataAttribute(
        lowestRankingUnitRef.current,
        "lowest-ranking-container"
      );
    }
  }, [props]);

  return (
    <React.Fragment>
      {showHighest && (
        <div className="ranking-unit-container highest-ranking-container">
          {props.isDataTile && (
            <div
              className={DATA_CSS_CLASS}
              data-csv={rankingPointsToCsv(points)}
            />
          )}
          <RankingUnit
            key={`${statVar}-highest`}
            unit={unit}
            forwardRef={highestRankingUnitRef}
            scaling={scaling}
            title={formatString(
              title || (highestTitle ? highestTitle : "Highest ${statVar}"),
              {
                date: dateRange,
                placeName: "",
                statVar: svName,
              }
            )}
            points={points.slice(-rankingCount).reverse()}
            isHighest={true}
            svNames={isMultiColumn ? svNames : undefined}
            formatNumberFn={formatNumber}
          />
          <ChartFooter
            sources={sources}
            handleEmbed={() => handleEmbed(points.reverse(), sources, true)}
          />
        </div>
      )}
      {showLowest && (
        <div className="ranking-unit-container lowest-ranking-container">
          {props.isDataTile && (
            <div
              className={DATA_CSS_CLASS}
              data-csv={rankingPointsToCsv(points)}
            />
          )}
          <RankingUnit
            key={`${statVar}-lowest`}
            unit={unit}
            forwardRef={lowestRankingUnitRef}
            scaling={scaling}
            title={formatString(
              title || (lowestTitle ? lowestTitle : "Lowest ${statVar}"),
              {
                date: dateRange,
                placeName: "",
                statVar: svName,
              }
            )}
            numDataPoints={numDataPoints}
            points={points.slice(0, rankingCount)}
            isHighest={false}
            svNames={isMultiColumn ? svNames : undefined}
            formatNumberFn={formatNumber}
          />
          <ChartFooter
            sources={sources}
            handleEmbed={() => handleEmbed(points, sources, false)}
          />
        </div>
      )}
    </React.Fragment>
  );
}
