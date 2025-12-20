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
 * Component for rendering a ranking tile.
 */

import _ from "lodash";
import React, {
  ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import {
  CSV_FIELD_DELIMITER,
  INITIAL_LOADING_CLASS,
} from "../../constants/tile_constants";
import { ChartEmbed } from "../../place/chart_embed";
import { DATE_HIGHEST_COVERAGE } from "../../shared/constants";
import {
  ENABLE_RANKING_TILE_SCROLL,
  isFeatureEnabled,
} from "../../shared/feature_flags/util";
import { useLazyLoad } from "../../shared/hooks";
import {
  buildObservationSpecs,
  ObservationSpec,
} from "../../shared/observation_specs";
import {
  PointApiResponse,
  SeriesApiResponse,
  StatMetadata,
} from "../../shared/stat_types";
import { StatVarFacetMap, StatVarSpec } from "../../shared/types";
import { getCappedStatVarDate } from "../../shared/util";
import { FacetSelectionCriteria } from "../../types/facet_selection_criteria";
import {
  RankingData,
  RankingGroup,
  RankingPoint,
} from "../../types/ranking_unit_types";
import { RankingTileSpec } from "../../types/subject_page_proto_types";
import { getDataCommonsClient } from "../../utils/data_commons_client";
import { getPointWithin } from "../../utils/data_fetch_utils";
import { getDateRange } from "../../utils/string_utils";
import {
  getDenomInfo,
  getDenomResp,
  getFirstCappedStatVarSpecDate,
  getNoDataErrorMsg,
  getStatFormat,
  getStatVarName,
  StatVarFacetDateRangeMap,
  transformCsvHeader,
  updateStatVarFacetDateRange,
} from "../../utils/tile_utils";
import { LoadingHeader } from "./loading_header";
import { SvRankingUnits } from "./sv_ranking_units";
import { ContainedInPlaceMultiVariableTileProp } from "./tile_types";

const RANKING_COUNT = 5;
const HEADING_HEIGHT = 36;
const PER_RANKING_HEIGHT = 24;
const FOOTER_HEIGHT = 26;
const LATEST_DATE_KEY = "latest";
const EMPTY_FACET_ID_KEY = "empty";

export interface RankingTilePropType
  extends ContainedInPlaceMultiVariableTileProp {
  hideFooter?: boolean;
  onHoverToggled?: (placeDcid: string, hover: boolean) => void;
  rankingMetadata: RankingTileSpec;
  footnote?: string;
  // Optional: Override sources for this tile
  sources?: string[];
  // Optional: only load this component when it's near the viewport
  lazyLoad?: boolean;
  /**
   * Optional: If lazy loading is enabled, load the component when it is within
   * this margin of the viewport. Default: "0px"
   */
  lazyLoadMargin?: string;
  // Optional: Passed into mixer calls to differentiate website and web components in usage logs
  surface?: string;
  // Metadata for the facet to highlight.
  facetSelector?: FacetSelectionCriteria;
  hyperlink?: string;
}

// TODO: Use ChartTileContainer like other tiles.
export function RankingTile(props: RankingTilePropType): ReactElement {
  const [rankingData, setRankingData] = useState<RankingData | undefined>(null);
  const embedModalElement = useRef<ChartEmbed>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { shouldLoad, containerRef } = useLazyLoad(props.lazyLoadMargin);

  const {
    variables,
    rankingMetadata,
    enclosedPlaceType,
    parentPlace,
    apiRoot,
    lazyLoad,
    surface,
  } = props;

  useEffect(() => {
    if (lazyLoad && !shouldLoad) {
      return;
    }
    (async (): Promise<void> => {
      try {
        setIsLoading(true);
        const rankingData = await fetchData(
          variables,
          rankingMetadata,
          enclosedPlaceType,
          parentPlace,
          apiRoot,
          surface,
          props.facetSelector
        );
        setRankingData(rankingData);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [
    lazyLoad,
    apiRoot,
    enclosedPlaceType,
    parentPlace,
    rankingMetadata,
    shouldLoad,
    variables,
    surface,
  ]);

  /**
    This hook merges all the facets across ranking units, providing a single
    list that is sent into the ChartEmbed (data/svg download) component. This
    allows the dialog to build a citation string that matches the data it provides.
   */
  const allFacets = useMemo(() => {
    if (!rankingData) return {};
    return Object.values(rankingData).reduce(
      (acc, svData) => ({ ...acc, ...svData.facets }),
      {}
    );
  }, [rankingData]);

  /**
    This hook merges the stat var to facet maps across ranking units, to provide a single
    list that is sent into the ChartEmbed (data/svg download) component. This
    allows the dialog to build a citation string that matches the data it provides.
   */
  const allStatVarToFacets = useMemo(() => {
    if (!rankingData) return {};
    return Object.values(rankingData).reduce(
      (acc, svData) => ({ ...acc, ...svData.statVarToFacets }),
      {}
    );
  }, [rankingData]);

  /**
    This hook merges the stat var / facet id date ranges across ranking units, to provide a single
    map that is sent into the "About this data" (metadata modal) component.
   */
  const allStatVarFacetDateRanges = useMemo(() => {
    if (!rankingData) return {};
    const merged: StatVarFacetDateRangeMap = {};
    Object.values(rankingData).forEach((svData) => {
      const ranges = svData.statVarFacetDateRanges;
      if (ranges) {
        for (const [sv, facetMap] of Object.entries(ranges)) {
          if (!merged[sv]) {
            merged[sv] = {};
          }
          for (const [facetId, range] of Object.entries(facetMap)) {
            if (!merged[sv][facetId]) {
              merged[sv][facetId] = { ...range };
            } else {
              if (range.minDate < merged[sv][facetId].minDate) {
                merged[sv][facetId].minDate = range.minDate;
              }
              if (range.maxDate > merged[sv][facetId].maxDate) {
                merged[sv][facetId].maxDate = range.maxDate;
              }
            }
          }
        }
      }
    });
    return merged;
  }, [rankingData]);

  /*
    TODO (nick-next) getObservationSpec uses similar merging to the above memos and can be
         updated to share functionality with the hooks.
   */
  /**
   * Callback function for building observation specifications.
   * This is used by the API dialog to generate API calls (e.g., cURL
   * commands) for the user.
   *
   * @returns A function that builds an array of `ObservationSpec`
   * objects, or `undefined` if chart data is not yet available.
   */
  const getObservationSpecs = useMemo(() => {
    if (!rankingData) {
      return undefined;
    }
    const allStatVarToFacets: StatVarFacetMap = {};
    for (const sv in rankingData) {
      if (rankingData[sv].statVarToFacets) {
        Object.assign(allStatVarToFacets, rankingData[sv].statVarToFacets);
      }
    }

    return (): ObservationSpec[] => {
      const updatedStatVarSpecs = props.variables.map((spec) => {
        // If the date is HIGHEST_COVERAGE, we get all data. This is because
        // the V2 API does not have a HIGHEST_COVERAGE concept.
        // Otherwise, if the date is blank, we ask for the latest.
        const effectiveDate =
          spec.date === DATE_HIGHEST_COVERAGE
            ? DATE_HIGHEST_COVERAGE
            : "LATEST";
        const finalDate = getCappedStatVarDate(spec.statVar, effectiveDate);

        return { ...spec, date: finalDate };
      });
      const entityExpression = `${props.parentPlace}<-containedInPlace+{typeOf:${props.enclosedPlaceType}}`;
      return buildObservationSpecs({
        statVarSpecs: updatedStatVarSpecs,
        statVarToFacets: allStatVarToFacets,
        entityExpression,
      });
    };
  }, [
    rankingData,
    props.parentPlace,
    props.enclosedPlaceType,
    props.variables,
  ]);

  const numRankingLists = getNumRankingLists(
    props.rankingMetadata,
    rankingData,
    props.variables
  );
  const rankingCount = props.rankingMetadata.rankingCount || RANKING_COUNT;
  // TODO: have a better way of calculating the loading placeholder height
  const placeHolderHeight =
    PER_RANKING_HEIGHT * rankingCount + FOOTER_HEIGHT + HEADING_HEIGHT;
  const placeHolderArray = Array(numRankingLists).fill("");
  const dataCommonsClient = getDataCommonsClient(props.apiRoot, props.surface);

  /**
   * Opens export modal window
   */
  function showChartEmbed(
    chartWidth: number,
    chartHeight: number,
    chartHtml: string,
    chartTitle: string,
    sources: string[]
  ): void {
    embedModalElement.current.show(
      "",
      () => {
        // Assume all variables will have the same date
        // TODO: Update getCsv to handle multiple dates
        const date = getFirstCappedStatVarSpecDate(props.variables);

        return dataCommonsClient.getCsv({
          childType: props.enclosedPlaceType,
          date,
          fieldDelimiter: CSV_FIELD_DELIMITER,
          parentEntity: props.parentPlace,
          transformHeader: transformCsvHeader,
          statVarSpecs: props.variables,
          variables: [],
        });
      },
      chartWidth,
      chartHeight,
      chartTitle,
      chartHtml,
      props.footnote,
      props.sources || Array.from(sources),
      props.surface
    );
  }
  return (
    <div
      className={`chart-container ${ASYNC_ELEMENT_HOLDER_CLASS} ranking-tile ${
        props.className
      } ${isLoading ? `loading ${INITIAL_LOADING_CLASS}` : ""}`}
      ref={containerRef}
      style={{
        gridTemplateColumns:
          numRankingLists > 1 ? "repeat(2, 1fr)" : "repeat(1, 1fr)",
      }}
    >
      {!rankingData &&
        placeHolderArray.map((_, i) => {
          return (
            <div className="loading" key={`ranking-placeholder-${i}`}>
              <div className="chart-headers">
                <LoadingHeader isLoading={true} />
              </div>
              <div style={{ minHeight: placeHolderHeight }}></div>
            </div>
          );
        })}
      {rankingData &&
        Object.keys(rankingData).map((statVar) => {
          const errorMsg =
            _.isEmpty(rankingData[statVar]) ||
            rankingData[statVar].numDataPoints === 0
              ? getNoDataErrorMsg(props.variables)
              : "";
          return (
            <SvRankingUnits
              apiRoot={props.apiRoot}
              containerRef={containerRef}
              entityType={props.enclosedPlaceType}
              errorMsg={errorMsg}
              footnote={props.footnote}
              getObservationSpecs={getObservationSpecs}
              hideFooter={props.hideFooter}
              isLoading={isLoading}
              key={statVar}
              onHoverToggled={props.onHoverToggled}
              rankingData={rankingData}
              rankingMetadata={props.rankingMetadata}
              showChartEmbed={showChartEmbed}
              showExploreMore={props.showExploreMore}
              sources={props.sources}
              statVar={statVar}
              tileId={props.id}
              title={props.title}
              statVarSpecs={props.variables}
              surface={props.surface}
              enableScroll={
                isFeatureEnabled(ENABLE_RANKING_TILE_SCROLL) &&
                props.rankingMetadata.showHighestLowest
              }
              hyperlink={props.hyperlink}
              parentPlace={props.parentPlace}
            />
          );
        })}
      <ChartEmbed
        container={containerRef.current}
        ref={embedModalElement}
        statVarSpecs={props.variables}
        facets={allFacets}
        statVarToFacets={allStatVarToFacets}
        statVarFacetDateRanges={allStatVarFacetDateRanges}
        apiRoot={props.apiRoot}
      />
    </div>
  );
}

export async function fetchData(
  variables: StatVarSpec[],
  rankingMetadata: RankingTileSpec,
  enclosedPlaceType: string,
  parentPlace: string,
  apiRoot: string,
  surface?: string,
  facetSelector?: FacetSelectionCriteria
): Promise<RankingData> {
  // Get map of date to map of facet id to variables that should use this date
  // and facet id for its data fetch
  const dateFacetToVariable = {
    [LATEST_DATE_KEY]: {
      [EMPTY_FACET_ID_KEY]: [],
    },
  };
  const facetsRequested = [];
  for (const spec of variables) {
    const variableDate = getCappedStatVarDate(spec.statVar, spec.date);
    const variableFacetId = spec.facetId || EMPTY_FACET_ID_KEY;
    if (spec.facetId) {
      facetsRequested.push(spec.facetId);
    }
    if (!dateFacetToVariable[variableDate]) {
      dateFacetToVariable[variableDate] = {};
    }
    if (!dateFacetToVariable[variableDate][variableFacetId]) {
      dateFacetToVariable[variableDate][variableFacetId] = [];
    }
    dateFacetToVariable[variableDate][variableFacetId].push(spec.statVar);
  }
  // Make one promise for each date
  const statPromises: Promise<PointApiResponse>[] = [];
  for (const date of Object.keys(dateFacetToVariable)) {
    if (_.isEmpty(dateFacetToVariable[date])) {
      continue;
    }
    for (const facetId of Object.keys(dateFacetToVariable[date])) {
      if (_.isEmpty(dateFacetToVariable[date][facetId])) {
        continue;
      }
      let dateParam = "";
      if (date !== LATEST_DATE_KEY) {
        dateParam = date;
      }
      let facetIds = [];
      if (facetId !== EMPTY_FACET_ID_KEY) {
        facetIds = [facetId];
      }
      statPromises.push(
        getPointWithin(
          apiRoot,
          enclosedPlaceType,
          parentPlace,
          dateFacetToVariable[date][facetId],
          dateParam,
          [],
          facetIds,
          surface,
          facetSelector
        )
      );
    }
  }
  const statResponses = await Promise.all(statPromises);
  // Merge the responses of all stat promises
  const mergedResponse: PointApiResponse = { data: {}, facets: {} };
  statResponses.forEach((resp) => {
    if (resp) {
      mergedResponse.data = Object.assign(mergedResponse.data, resp.data);
      mergedResponse.facets = Object.assign(mergedResponse.facets, resp.facets);
    }
  });

  const denoms = _.uniq(
    variables.map((spec) => spec.denom).filter((sv) => !!sv)
  );
  let denomsByFacet: Record<string, SeriesApiResponse> = {};
  let defaultDenomData: SeriesApiResponse = null;

  if (!_.isEmpty(denoms)) {
    [denomsByFacet, defaultDenomData] = await getDenomResp(
      denoms,
      mergedResponse,
      apiRoot,
      true, // useSeriesWithin
      surface,
      undefined, // allPlaces
      parentPlace,
      enclosedPlaceType
    );
  }

  const rankingData = pointApiToPerSvRankingData(
    mergedResponse,
    denomsByFacet,
    defaultDenomData,
    variables
  );
  if (rankingMetadata.showMultiColumn) {
    return transformRankingDataForMultiColumn(rankingData, variables);
  }
  return rankingData;
}

// Reduces RankingData to only the SV used for sorting, to be compatible for multi-column rendering in RankingUnit.
function transformRankingDataForMultiColumn(
  rankingData: RankingData,
  statVarSpecs: StatVarSpec[]
): RankingData {
  const svs = statVarSpecs.map((spec) => spec.statVar);
  const sortSv = svs[svs.length - 1];
  const sortedPlacePoints = rankingData[sortSv].points;
  const svsToDict = svs.map((sv) => {
    const placeToVal = {};
    const points = rankingData[sv].points;
    for (const p of points) {
      placeToVal[p.placeDcid] = p.value;
    }
    return placeToVal;
  });
  for (const p of sortedPlacePoints) {
    p.value = undefined;
    p.values = svs.map((_, i) => svsToDict[i][p.placeDcid]);
  }
  rankingData[sortSv].unit = statVarSpecs.map((spec) => spec.unit);
  rankingData[sortSv].scaling = statVarSpecs.map((spec) => spec.scaling);
  rankingData[sortSv].svName = statVarSpecs.map((spec) =>
    getStatVarName(spec.statVar, [spec])
  );

  const facets = svs
    .map((sv) => rankingData[sv].facets)
    .find((f) => f !== undefined);
  const statVarToFacets = svs
    .map((sv) => rankingData[sv].statVarToFacets)
    .find((s) => s !== undefined);

  const statVarFacetDateRanges = svs
    .map((sv) => rankingData[sv].statVarFacetDateRanges)
    .find((s) => s !== undefined);

  if (facets) {
    rankingData[sortSv].facets = facets;
  }
  if (statVarToFacets) {
    rankingData[sortSv].statVarToFacets = statVarToFacets;
  }
  if (statVarFacetDateRanges) {
    rankingData[sortSv].statVarFacetDateRanges = statVarFacetDateRanges;
  }

  return { [sortSv]: rankingData[sortSv] };
}

function pointApiToPerSvRankingData(
  statData: PointApiResponse,
  denomData: Record<string, SeriesApiResponse>,
  defaultDenomData: SeriesApiResponse,
  statVarSpecs: StatVarSpec[]
): RankingData {
  const rankingData: RankingData = {};
  // Get Ranking data
  for (const spec of statVarSpecs) {
    if (!(spec.statVar in statData.data)) {
      continue;
    }
    const rankingPoints: RankingPoint[] = [];
    // Note: this returns sources and dates for all places, even those which
    // might not display.
    const sources = new Set<string>();
    const dates = new Set<string>();
    const facets: Record<string, StatMetadata> = {};
    const statVarToFacets: StatVarFacetMap = {};
    const statVarFacetDateRanges: StatVarFacetDateRangeMap = {};

    const { unit, scaling } = getStatFormat(spec, statData);
    for (const place in statData.data[spec.statVar]) {
      const statPoint = statData.data[spec.statVar][place];
      const rankingPoint = {
        date: statPoint.date,
        placeDcid: place,
        value: statPoint.value,
      };
      if (_.isUndefined(rankingPoint.value)) {
        console.log(`Skipping ${place}, missing ${spec.statVar}`);
        continue;
      }

      updateStatVarFacetDateRange(
        statVarFacetDateRanges,
        spec.statVar,
        statPoint.facet,
        statPoint.date
      );

      if (spec.denom) {
        // find the denom data with the matching facet, and otherwise use the default data
        const denomInfo = getDenomInfo(
          spec,
          denomData,
          place,
          statPoint.date,
          statPoint.facet,
          defaultDenomData
        );
        if (!denomInfo) {
          console.log(`Skipping ${place}, missing ${spec.denom}`);
          continue;
        }
        rankingPoint.value /= denomInfo.value;
        /*
          To make full denominator facet information available outside the chart, we add the denominator facet
          to the statVarToFacets map (which is ultimately passed into the TileSources component). With this,
          the metadata modal can display full metadata for the per capita stat var and facets used in the chart.
         */
        if (denomInfo.facetId && denomInfo.facet) {
          sources.add(denomInfo.source);
          facets[denomInfo.facetId] = denomInfo.facet;
          if (!statVarToFacets[spec.denom]) {
            statVarToFacets[spec.denom] = new Set<string>();
          }
          statVarToFacets[spec.denom].add(denomInfo.facetId);
        }
        // Update date range for the denominator stat var
        updateStatVarFacetDateRange(
          statVarFacetDateRanges,
          spec.denom,
          denomInfo.facetId,
          denomInfo.date
        );
      }
      rankingPoints.push(rankingPoint);
      dates.add(statPoint.date);
      if (statPoint.facet && statData.facets[statPoint.facet]) {
        facets[statPoint.facet] = statData.facets[statPoint.facet];
        if (!statVarToFacets[spec.statVar]) {
          statVarToFacets[spec.statVar] = new Set<string>();
        }
        statVarToFacets[spec.statVar].add(statPoint.facet);

        const statPointSource = statData.facets[statPoint.facet].provenanceUrl;
        if (statPointSource) {
          sources.add(statPointSource);
        }
      }
    }
    rankingPoints.sort((a, b) => {
      return a.value - b.value;
    });
    const numDataPoints = rankingPoints.length;
    rankingData[spec.statVar] = {
      points: rankingPoints,
      unit: [unit],
      scaling: [scaling],
      numDataPoints,
      sources,
      facets,
      statVarToFacets,
      statVarFacetDateRanges,
      dateRange: getDateRange(Array.from(dates)),
      svName: [getStatVarName(spec.statVar, [spec])],
    };
  }
  return rankingData;
}

/**
 * Gets the number of ranking lists that will be shown
 * @param rankingTileSpec ranking tile specifications
 * @param rankingData ranking data to be shown
 * @param statVarSpecs an array of stat var specs
 */
function getNumRankingLists(
  rankingTileSpec: RankingTileSpec,
  rankingData: { [sv: string]: RankingGroup },
  statVarSpecs: StatVarSpec[]
): number {
  if (rankingTileSpec.showMultiColumn) {
    return [rankingTileSpec.showHighest, rankingTileSpec.showLowest].filter(
      Boolean
    ).length;
  }
  let numListsPerSv = 0;
  if (rankingTileSpec.showHighest) {
    numListsPerSv++;
  }
  if (rankingTileSpec.showLowest) {
    numListsPerSv++;
  }
  // if showHighestLowest is set, will show a single list and ignore
  // showHighest/showLowest.
  if (rankingTileSpec.showHighestLowest) {
    numListsPerSv = 1;
  }
  if (!rankingData) {
    return statVarSpecs.length * numListsPerSv;
  }
  return Object.keys(rankingData).length * numListsPerSv;
}
