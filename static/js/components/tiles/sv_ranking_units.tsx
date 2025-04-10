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
import React, { RefObject, useRef } from "react";

import { VisType } from "../../apps/visualization/vis_type_configs";
import { URL_PATH } from "../../constants/app/visualization_constants";
import { intl } from "../../i18n/i18n";
import { messages } from "../../i18n/i18n_messages";
import { StatVarSpec } from "../../shared/types";
import {
  RankingData,
  RankingGroup,
  RankingPoint,
} from "../../types/ranking_unit_types";
import { RankingTileSpec } from "../../types/subject_page_proto_types";
import { getHash } from "../../utils/app/visualization_utils";
import { formatString, TileSources } from "../../utils/tile_utils";
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
    chartTitle: string,
    sources: string[]
  ) => void;
  statVar: string;
  entityType: string;
  tileId: string;
  title?: string;
  showExploreMore?: boolean;
  apiRoot?: string;
  hideFooter?: boolean;
  onHoverToggled?: (placeDcid: string, hover: boolean) => void;
  errorMsg?: string;
  footnote?: string;
  // Optional: Override sources for this tile
  sources?: string[];
  isLoading?: boolean;
  statVarSpecs: StatVarSpec[];
  containerRef: React.RefObject<HTMLElement>;
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
  function handleEmbed(isHighest: boolean, chartTitle: string): void {
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
      chartTitle,
      props.sources || Array.from(rankingGroup.sources)
    );
  }
  const chartTitle = getChartTitle(title, rankingGroup);
  return (
    <React.Fragment>
      {rankingMetadata.showHighestLowest || props.errorMsg ? (
        <div className="ranking-unit-container highest-ranking-container">
          {getRankingUnit(
            title,
            statVar,
            props.entityType,
            rankingGroup,
            rankingMetadata,
            true,
            props.apiRoot,
            props.statVarSpecs,
            props.containerRef,
            highestRankingUnitRef,
            props.onHoverToggled,
            props.errorMsg,
            props.sources,
            props.isLoading
          )}
          {!props.hideFooter && (
            <ChartFooter
              handleEmbed={
                props.errorMsg
                  ? null
                  : (): void => handleEmbed(true, chartTitle)
              }
              exploreLink={
                props.showExploreMore && !props.errorMsg
                  ? getExploreLink(props, true)
                  : null
              }
              footnote={props.footnote}
            ></ChartFooter>
          )}
        </div>
      ) : (
        <>
          {rankingMetadata.showHighest && (
            <div className="ranking-unit-container highest-ranking-container">
              {getRankingUnit(
                title,
                statVar,
                props.entityType,
                rankingGroup,
                rankingMetadata,
                true,
                props.apiRoot,
                props.statVarSpecs,
                props.containerRef,
                highestRankingUnitRef,
                props.onHoverToggled,
                undefined,
                props.sources,
                props.isLoading
              )}
              {!props.hideFooter && (
                <ChartFooter
                  handleEmbed={(): void => handleEmbed(true, chartTitle)}
                  exploreLink={
                    props.showExploreMore ? getExploreLink(props, true) : null
                  }
                  footnote={props.footnote}
                ></ChartFooter>
              )}
            </div>
          )}
          {rankingMetadata.showLowest && (
            <div className="ranking-unit-container lowest-ranking-container">
              {getRankingUnit(
                title,
                statVar,
                props.entityType,
                rankingGroup,
                rankingMetadata,
                false,
                props.apiRoot,
                props.statVarSpecs,
                props.containerRef,
                lowestRankingUnitRef,
                props.onHoverToggled,
                undefined,
                props.sources,
                props.isLoading
              )}
              {!props.hideFooter && (
                <ChartFooter
                  handleEmbed={(): void => handleEmbed(false, chartTitle)}
                  exploreLink={
                    props.showExploreMore ? getExploreLink(props, false) : null
                  }
                  footnote={props.footnote}
                ></ChartFooter>
              )}
            </div>
          )}
        </>
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
 * Returns title of overall chart
 *
 * @param tileConfigTitle Title from tile with format strings.
 * @param rankingGroup Chart ranking group
 * @returns formatted title
 */
function getChartTitle(
  tileConfigTitle: string,
  rankingGroup: RankingGroup
): string {
  const rs = {
    date: rankingGroup.dateRange,
    placeName: "",
  };
  // Use tile config title if specified
  if (tileConfigTitle) {
    return formatString(tileConfigTitle, rs);
  }
  // Otherwise variable names joined together
  return rankingGroup.svName.join(", ");
}

/**
 * Gets the top points and bottom points to display in a ranking unit
 * @param rankingMetadata the RankingTileSpec to get the points for
 * @param isHighest whether or not this ranking unit is showing the points as
 *                  highest to lowest or the other way around
 * @param rankingGroup the RankingGroup information to get the points for
 */
export function getRankingUnitPoints(
  rankingMetadata: RankingTileSpec,
  isHighest: boolean,
  rankingGroup: RankingGroup
): { topPoints: RankingPoint[]; bottomPoints: RankingPoint[] } {
  const rankingCount = rankingMetadata.rankingCount || RANKING_COUNT;
  const topPoints = isHighest
    ? rankingGroup.points.slice(-rankingCount).reverse()
    : rankingGroup.points.slice(0, rankingCount);
  let bottomPoints = null;
  if (rankingMetadata.showHighestLowest) {
    // we want a gap of at least 1 point between the top and bottom points
    const numBottomPoints = Math.min(
      rankingGroup.points.length - rankingCount - 1,
      rankingCount
    );
    bottomPoints = rankingGroup.points.slice(0, numBottomPoints).reverse();
  }
  return { topPoints, bottomPoints };
}

/**
 * Gets a ranking unit as an element
 * @param tileConfigTitle title of the tile
 * @param statVar dcid of the statVar to get the ranking unit for
 * @param rankingGroup the RankingGroup information to get the ranking unit for
 * @param rankingMetadata the RankingTileSpec to get the ranking unit for
 * @param isHighest whether or not this ranking unit is showing highest
 * @param rankingUnitRef ref object to attach to the ranking unit
 * @param onHoverToggled callback when user hovers over a row
 * @param errorMsg Erorr message
 * @param sources Optional: Override sources list with this list of  URLs
 */
export function getRankingUnit(
  tileConfigTitle: string,
  statVar: string,
  entityType: string,
  rankingGroup: RankingGroup,
  rankingMetadata: RankingTileSpec,
  isHighest: boolean,
  apiRoot: string,
  statVarSpecs: StatVarSpec[],
  containerRef: React.RefObject<HTMLElement>,
  rankingUnitRef?: RefObject<HTMLDivElement>,
  onHoverToggled?: (placeDcid: string, hover: boolean) => void,
  errorMsg?: string,
  sources?: string[],
  isLoading?: boolean
): JSX.Element {
  const { topPoints, bottomPoints } = getRankingUnitPoints(
    rankingMetadata,
    isHighest,
    rankingGroup
  );
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
      topPoints={topPoints}
      bottomPoints={bottomPoints}
      numDataPoints={rankingGroup.numDataPoints}
      isHighest={isHighest}
      isLoading={isLoading}
      svNames={
        rankingMetadata.showMultiColumn ? rankingGroup.svName : undefined
      }
      onHoverToggled={onHoverToggled}
      headerChild={
        errorMsg ? null : (
          <TileSources
            apiRoot={apiRoot}
            containerRef={containerRef}
            sources={sources || rankingGroup.sources}
            statVarSpecs={statVarSpecs}
          />
        )
      }
      errorMsg={errorMsg}
      apiRoot={apiRoot}
      entityType={entityType}
    />
  );
}

function getExploreLink(
  props: SvRankingUnitsProps,
  isHighest: boolean
): { url: string; displayText: string } {
  const rankingGroup = props.rankingData[props.statVar];
  const rankingCount = props.rankingMetadata.rankingCount || RANKING_COUNT;
  const places = isHighest
    ? rankingGroup.points.slice(-rankingCount).map((point) => point.placeDcid)
    : rankingGroup.points
        .slice(0, rankingCount)
        .map((point) => point.placeDcid);
  const hash = getHash(
    VisType.TIMELINE,
    places,
    "",
    [{ dcid: props.statVar, info: {} }],
    {}
  );
  return {
    displayText: intl.formatMessage(messages.timelineTool),
    url: `${props.apiRoot || ""}${URL_PATH}#${hash}`,
  };
}
