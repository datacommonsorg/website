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
import _ from "lodash";
import React, { RefObject, useEffect, useRef } from "react";

import { ASYNC_ELEMENT_CLASS } from "../../constants/css_constants";
import { DATA_CSS_CLASS } from "../../constants/tile_constants";
import {
  RankingData,
  RankingGroup,
  RankingPoint,
} from "../../types/ranking_unit_types";
import { RankingTileSpec } from "../../types/subject_page_proto_types";
import { rankingPointsToCsv } from "../../utils/chart_csv_utils";
import { htmlToSvg } from "../../utils/svg_utils";
import { formatString } from "../../utils/tile_utils";
import { RankingUnit } from "../ranking_unit";
import { ChartFooter } from "./chart_footer";

const RANKING_COUNT = 5;

interface SvRankingUnitsProps {
  rankingData: RankingData;
  rankingMetadata: RankingTileSpec;
  showChartEmbed: (
    chartWidth: number,
    chartHeight: number,
    chartHtml: string,
    rankingPoints: RankingPoint[],
    sources: string[],
    svNames: string[]
  ) => void;
  statVar: string;
  title?: string;
  // Whether or not to render the data version of these units
  isDataTile?: boolean;
}

/**
 * Ranking unit tables for a stat var.
 * @param props SvRankingUnitsProps
 */
export function SvRankingUnits(props: SvRankingUnitsProps): JSX.Element {
  const { rankingData, rankingMetadata, showChartEmbed, statVar, title } =
    props;
  const rankingGroup = rankingData[statVar];
  const highestRankingUnitRef = useRef<HTMLDivElement>();
  const lowestRankingUnitRef = useRef<HTMLDivElement>();

  /**
   * Build content and triggers export modal window
   */
  function handleEmbed(isHighest: boolean): void {
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
    const points = isHighest
      ? rankingGroup.points.slice().reverse()
      : rankingGroup.points;
    showChartEmbed(
      chartWidth,
      chartHeight,
      chartHtml,
      points,
      Array.from(rankingGroup.sources),
      rankingGroup.svName
    );
  }

  // Generates an svg from an html div element and attaches it to the tile data
  // as a data-svg attribute.
  function addSvgDataAttribute(
    chartDiv: HTMLDivElement,
    dataContainerClass: string
  ): void {
    const svg = htmlToSvg(
      chartDiv.outerHTML,
      chartDiv.offsetWidth,
      chartDiv.offsetHeight,
      ASYNC_ELEMENT_CLASS,
      { "font-family": "sans-serif" }
    );

    const s = new XMLSerializer();
    const svgXml = s.serializeToString(svg);
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
      {rankingMetadata.showHighest && (
        <div
          className={`ranking-unit-container ${ASYNC_ELEMENT_CLASS} highest-ranking-container`}
        >
          {props.isDataTile && (
            <div
              className={DATA_CSS_CLASS}
              data-csv={rankingPointsToCsv(
                rankingGroup.points,
                rankingGroup.svName
              )}
            />
          )}
          {getRankingUnit(
            title,
            statVar,
            rankingGroup,
            rankingMetadata,
            true,
            highestRankingUnitRef
          )}
          <ChartFooter
            sources={rankingGroup.sources}
            handleEmbed={() => handleEmbed(true)}
          />
        </div>
      )}
      {rankingMetadata.showLowest && (
        <div
          className={`ranking-unit-container ${ASYNC_ELEMENT_CLASS} lowest-ranking-container`}
        >
          {props.isDataTile && (
            <div
              className={DATA_CSS_CLASS}
              data-csv={rankingPointsToCsv(
                rankingGroup.points,
                rankingGroup.svName
              )}
            />
          )}
          {getRankingUnit(
            title,
            statVar,
            rankingGroup,
            rankingMetadata,
            false,
            lowestRankingUnitRef
          )}
          <ChartFooter
            sources={rankingGroup.sources}
            handleEmbed={() => handleEmbed(false)}
          />
        </div>
      )}
    </React.Fragment>
  );
}

/**
 * Gets the title for a ranking unit
 * @param tileConfigTitle title of the tile
 * @param rankingMetadata the RankingTileSpec for the ranking unit
 * @param rankingGroup the RankingGroup for the ranking unit
 * @param isHighest whether or not this title is for a ranking unit that shows
 *                  highest
 * @param statVar the dcid of the stat var that the ranking unit is showing
 */
export function getRankingUnitTitle(
  tileConfigTitle: string,
  rankingMetadata: RankingTileSpec,
  rankingGroup: RankingGroup,
  isHighest: boolean,
  statVar: string
): string {
  let title = tileConfigTitle;
  if (!title) {
    if (isHighest) {
      title = rankingMetadata.highestTitle || "Highest ${statVar}";
    } else {
      title = rankingMetadata.lowestTitle || "Lowest ${statVar}";
    }
  }
  const rs = {
    date: rankingGroup.dateRange,
    placeName: "",
    statVar: rankingGroup.svName.length ? rankingGroup.svName[0] : statVar,
  };
  return formatString(title, rs);
}

/**
 * Gets a ranking unit as an element
 * @param tileConfigTitle title of the tile
 * @param statVar dcid of the statVar to get the ranking unit for
 * @param rankingGroup the RankingGroup information to get the ranking unit for
 * @param rankingMetadata the RankingTileSpec to get the ranking unit for
 * @param isHighest whether or not this ranking unit is showing highest
 * @param rankingUnitRef ref object to attach to the ranking unit
 */
export function getRankingUnit(
  tileConfigTitle: string,
  statVar: string,
  rankingGroup: RankingGroup,
  rankingMetadata: RankingTileSpec,
  isHighest: boolean,
  rankingUnitRef?: RefObject<HTMLDivElement>
): JSX.Element {
  const rankingCount = rankingMetadata.rankingCount || RANKING_COUNT;
  const points = isHighest
    ? rankingGroup.points.slice(-rankingCount).reverse()
    : rankingGroup.points.slice(0, rankingCount);
  const title = getRankingUnitTitle(
    tileConfigTitle,
    rankingMetadata,
    rankingGroup,
    isHighest,
    statVar
  );
  return (
    <RankingUnit
      key={`${statVar}-highest`}
      unit={rankingGroup.unit}
      forwardRef={rankingUnitRef}
      scaling={rankingGroup.scaling}
      title={title}
      points={points}
      numDataPoints={rankingGroup.numDataPoints}
      isHighest={isHighest}
      svNames={
        rankingMetadata.showMultiColumn ? rankingGroup.svName : undefined
      }
    />
  );
}
