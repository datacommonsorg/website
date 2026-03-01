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
 * Component for rendering a scatter type tile.
 */

import { ISO_CODE_ATTRIBUTE } from "@datacommonsorg/client";
import axios from "axios";
import _ from "lodash";
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { VisType } from "../../apps/visualization/vis_type_configs";
import {
  drawScatter,
  Point,
  ScatterPlotOptions,
  ScatterPlotProperties,
} from "../../chart/draw_scatter";
import { URL_PATH } from "../../constants/app/visualization_constants";
import { ChartQuadrant } from "../../constants/scatter_chart_constants";
import { CSV_FIELD_DELIMITER } from "../../constants/tile_constants";
import { intl } from "../../i18n/i18n";
import { messages } from "../../i18n/i18n_messages";
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
import {
  NamedTypedPlace,
  StatVarFacetMap,
  StatVarSpec,
} from "../../shared/types";
import { SHOW_POPULATION_OFF } from "../../tools/scatter/context";
import { getStatWithinPlace } from "../../tools/scatter/util";
import { ScatterTileSpec } from "../../types/subject_page_proto_types";
import {
  getContextStatVar,
  getHash,
} from "../../utils/app/visualization_utils";
import { stringifyFn } from "../../utils/axios";
import { getDataCommonsClient } from "../../utils/data_commons_client";
import { getStringOrNA } from "../../utils/number_utils";
import { getPlaceScatterData } from "../../utils/scatter_data_utils";
import { getDateRange } from "../../utils/string_utils";
import {
  clearContainer,
  getDenomInfo,
  getDenomResp,
  getFirstCappedStatVarSpecDate,
  getNoDataErrorMsg,
  getStatFormat,
  getStatVarNames,
  ReplacementStrings,
  StatVarFacetDateRangeMap,
  transformCsvHeader,
  updateStatVarFacetDateRange,
} from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

export interface ScatterTilePropType {
  id: string;
  title: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  statVarSpec: StatVarSpec[];
  // Height, in px, for the SVG chart.
  svgChartHeight: number;
  scatterTileSpec: ScatterTileSpec;
  // Extra classes to add to the container.
  className?: string;
  // API root
  apiRoot?: string;
  // Whether or not to show the explore more button.
  showExploreMore?: boolean;
  // Text to show in footer
  footnote?: string;
  // The property to use to get place names.
  placeNameProp?: string;
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
  // Optional: Passed into mixer calls to differentiate website and web components in usage logs
  surface?: string;
}

interface RawData {
  placeStats: PointApiResponse;
  denomsByFacet: Record<string, SeriesApiResponse>;
  defaultDenomData: SeriesApiResponse;
  placeNames: { [placeDcid: string]: string };
  statVarNames: { [statVarDcid: string]: string };
}

interface ScatterChartData {
  xStatVar: StatVarSpec;
  yStatVar: StatVarSpec;
  points: { [placeDcid: string]: Point };
  // A set of string sources (URLs)
  sources: Set<string>;
  // A full set of the facets used within the chart
  facets: Record<string, StatMetadata>;
  // A mapping of which stat var used which facets
  statVarToFacets: StatVarFacetMap;
  // A map of stat var dcids to facet IDs to their specific min and max date range from the chart
  statVarFacetDateRanges: StatVarFacetDateRangeMap;
  xUnit: string;
  yUnit: string;
  xDate: string;
  yDate: string;
  errorMsg: string;
  // props used when fetching this data
  props: ScatterTilePropType;
  // Names of stat vars to use for labels
  xStatVarName: string;
  yStatVarName: string;
}

export function ScatterTile(props: ScatterTilePropType): ReactElement {
  const svgContainer = useRef(null);
  const tooltip = useRef(null);
  const [scatterChartData, setScatterChartData] = useState<
    ScatterChartData | undefined
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const { shouldLoad, containerRef } = useLazyLoad(props.lazyLoadMargin);
  /*
    TODO: (nick-next) destructure the props similarly to highlight to
          allow a complete dependency array.
   */
  useEffect(() => {
    if (props.lazyLoad && !shouldLoad) {
      return;
    }
    if (scatterChartData && areDataPropsEqual()) {
      // only re-fetch if the props that affect data fetch are not equal
      return;
    }
    (async (): Promise<void> => {
      try {
        setIsLoading(true);
        const data = await fetchData(props);
        if (props && data && _.isEqual(data.props, props)) {
          setScatterChartData(data);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [
    props.lazyLoad,
    props.apiRoot,
    props.place.dcid,
    props.placeNameProp,
    props.enclosedPlaceType,
    props.statVarSpec,
    scatterChartData,
    shouldLoad,
  ]);

  const drawFn = useCallback(() => {
    if (!scatterChartData || !areDataPropsEqual()) {
      return;
    }
    draw(
      scatterChartData,
      svgContainer.current,
      props.svgChartHeight,
      tooltip.current,
      props.scatterTileSpec || {}
    );
  }, [
    props.svgChartHeight,
    props.scatterTileSpec,
    scatterChartData,
    shouldLoad,
  ]);

  useDrawOnResize(drawFn, svgContainer.current);

  /**
   * Callback function for building observation specifications.
   * This is used by the API dialog to generate API calls (e.g., cURL
   * commands) for the user.
   *
   * @returns A function that builds an array of `ObservationSpec`
   * objects, or `undefined` if chart data is not yet available.
   */
  const getObservationSpecs = useMemo(() => {
    if (!scatterChartData) {
      return undefined;
    }
    return (): ObservationSpec[] => {
      const entityExpression = `${props.place.dcid}<-containedInPlace+{typeOf:${props.enclosedPlaceType}}`;
      const defaultDate =
        getFirstCappedStatVarSpecDate(props.statVarSpec) || "LATEST";
      return buildObservationSpecs({
        statVarSpecs: props.statVarSpec,
        statVarToFacets: scatterChartData.statVarToFacets,
        entityExpression,
        defaultDate,
      });
    };
  }, [
    scatterChartData,
    props.place,
    props.enclosedPlaceType,
    props.statVarSpec,
  ]);

  return (
    <ChartTileContainer
      allowEmbed={true}
      apiRoot={props.apiRoot}
      className={`${props.className} scatter-chart`}
      exploreLink={props.showExploreMore ? getExploreLink(props) : null}
      footnote={props.footnote}
      getDataCsv={getDataCsvCallback(props, scatterChartData)}
      getObservationSpecs={getObservationSpecs}
      errorMsg={scatterChartData && scatterChartData.errorMsg}
      id={props.id}
      isInitialLoading={_.isNull(scatterChartData)}
      isLoading={isLoading}
      replacementStrings={getReplacementStrings(props, scatterChartData)}
      sources={props.sources || (scatterChartData && scatterChartData.sources)}
      facets={scatterChartData?.facets}
      statVarToFacets={scatterChartData?.statVarToFacets}
      statVarFacetDateRanges={scatterChartData?.statVarFacetDateRanges}
      subtitle={props.subtitle}
      title={props.title}
      statVarSpecs={props.statVarSpec}
      forwardRef={containerRef}
      surface={props.surface}
    >
      <div className="scatter-tile-content">
        <div
          id={props.id}
          className="scatter-svg-container"
          ref={svgContainer}
          style={{
            minHeight: props.svgChartHeight,
            display:
              scatterChartData && scatterChartData.errorMsg ? "none" : "block",
          }}
        />
        <div
          id="scatter-tooltip"
          ref={tooltip}
          style={{ visibility: "hidden" }}
        />
      </div>
    </ChartTileContainer>
  );

  function areDataPropsEqual(): boolean {
    const oldDataProps = [
      scatterChartData.props.place,
      scatterChartData.props.enclosedPlaceType,
      scatterChartData.props.statVarSpec,
    ];
    const newDataProps = [
      props.place,
      props.enclosedPlaceType,
      props.statVarSpec,
    ];
    return _.isEqual(oldDataProps, newDataProps);
  }
}

/**
 * Returns callback for fetching chart CSV data
 * @param props Chart properties
 * @param scatterChartData Chart data
 * @returns Async function for fetching chart CSV
 */
function getDataCsvCallback(
  props: ScatterTilePropType,
  scatterChartData: ScatterChartData
): () => Promise<string> {
  return () => {
    const dataCommonsClient = getDataCommonsClient(
      props.apiRoot,
      props.surface
    );
    // Assume both variables will have the same date
    /*
     TODO (nick-next): Update getDataCsv to handle different dates for different variables
        see also chart_loader.tsx in the scatter viz tool.
     */
    const date = getFirstCappedStatVarSpecDate(props.statVarSpec);
    const clientStatVarSpecs = [
      scatterChartData.xStatVar,
      scatterChartData.yStatVar,
    ];

    const entityProps = props.placeNameProp
      ? [props.placeNameProp, ISO_CODE_ATTRIBUTE]
      : undefined;

    return dataCommonsClient.getCsv({
      childType: props.enclosedPlaceType,
      date,
      entityProps,
      fieldDelimiter: CSV_FIELD_DELIMITER,
      parentEntity: props.place.dcid,
      transformHeader: transformCsvHeader,
      statVarSpecs: clientStatVarSpecs,
      variables: [],
    });
  };
}

// Get the ReplacementStrings object used for formatting the title
export function getReplacementStrings(
  props: ScatterTilePropType,
  chartData: ScatterChartData
): ReplacementStrings {
  return {
    placeName: props.place.name,
    xDate: chartData && chartData.xDate,
    yDate: chartData && chartData.yDate,
  };
}

async function getPopulationInfo(
  placeDcid: string,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[],
  statResp: PointApiResponse,
  surface: string,
  apiRoot?: string
): Promise<[Record<string, SeriesApiResponse>, SeriesApiResponse]> {
  const statVars = new Set<string>();
  for (const sv of statVarSpec) {
    if (sv.denom) {
      statVars.add(sv.denom);
    }
  }
  if (_.isEmpty(statVars)) {
    return [null, null];
  }

  const [denomsByFacet, defaultDenomData] = await getDenomResp(
    [...statVars],
    statResp,
    apiRoot,
    true,
    surface,
    null,
    placeDcid,
    enclosedPlaceType
  );

  return [denomsByFacet, defaultDenomData];
}

export const fetchData = async (
  props: ScatterTilePropType
): Promise<ScatterChartData> => {
  if (props.statVarSpec.length < 2) {
    // TODO: add error message
    return;
  }
  const placeStatsPromise = getStatWithinPlace(
    props.place.dcid,
    props.enclosedPlaceType,
    [
      {
        statVarDcid: props.statVarSpec[0].statVar,
        date: props.statVarSpec[0].date,
        facetId: props.statVarSpec[0].facetId,
      },
      {
        statVarDcid: props.statVarSpec[1].statVar,
        date: props.statVarSpec[1].date,
        facetId: props.statVarSpec[1].facetId,
      },
    ],
    props.apiRoot,
    props.surface
  );
  const placeNamesParams = {
    dcid: props.place.dcid,
    descendentType: props.enclosedPlaceType,
  };
  if (props.placeNameProp) {
    placeNamesParams["prop"] = props.placeNameProp;
  }
  const placeNamesPromise = axios
    .get(`${props.apiRoot || ""}/api/place/descendent/name`, {
      params: placeNamesParams,
      paramsSerializer: stringifyFn,
    })
    .then((resp) => resp.data);
  try {
    const [placeStats, placeNames] = await Promise.all([
      placeStatsPromise,
      placeNamesPromise,
    ]);
    // this formats and resolves the denominator query promises for every facet used in the numerators,
    // plus a default denominator result that is used if a given entity's facet doesn't provide the denominator data
    const [denomsByFacet, defaultDenomData] = await getPopulationInfo(
      props.place.dcid,
      props.enclosedPlaceType,
      props.statVarSpec,
      placeStats,
      props.surface,
      props.apiRoot
    );
    const statVarNames = await getStatVarNames(
      props.statVarSpec,
      props.apiRoot
    );
    const rawData = {
      placeStats,
      denomsByFacet,
      defaultDenomData,
      placeNames,
      statVarNames,
    };
    const result = rawToChart(rawData, props);
    return result;
  } catch (error) {
    return null;
  }
};

function rawToChart(
  rawData: RawData,
  props: ScatterTilePropType
): ScatterChartData {
  const yStatVar = props.statVarSpec[0];
  const xStatVar = props.statVarSpec[1];
  const yPlacePointStat = rawData.placeStats.data[yStatVar.statVar];
  const xPlacePointStat = rawData.placeStats.data[xStatVar.statVar];
  const xStatVarName = rawData.statVarNames[xStatVar.statVar];
  const yStatVarName = rawData.statVarNames[yStatVar.statVar];
  if (!xPlacePointStat || !yPlacePointStat) {
    return;
  }
  const points = {};

  const sources: Set<string> = new Set();
  const facets: Record<string, StatMetadata> = {};
  const statVarToFacets: StatVarFacetMap = {};
  const statVarFacetDateRanges: StatVarFacetDateRangeMap = {};

  const xDates: Set<string> = new Set();
  const yDates: Set<string> = new Set();
  const xUnitScaling = getStatFormat(xStatVar, rawData.placeStats);
  const yUnitScaling = getStatFormat(yStatVar, rawData.placeStats);

  const metadataMap = rawData.placeStats.facets || {};

  for (const place in xPlacePointStat) {
    const facetId = xPlacePointStat[place].facet;
    if (facetId && metadataMap[facetId]) {
      facets[facetId] = metadataMap[facetId];
      if (!statVarToFacets[xStatVar.statVar]) {
        statVarToFacets[xStatVar.statVar] = new Set();
      }
      statVarToFacets[xStatVar.statVar].add(facetId);
    }
  }

  for (const place in yPlacePointStat) {
    const facetId = yPlacePointStat[place].facet;
    if (facetId && metadataMap[facetId]) {
      facets[facetId] = metadataMap[facetId];
      if (!statVarToFacets[yStatVar.statVar]) {
        statVarToFacets[yStatVar.statVar] = new Set();
      }
      statVarToFacets[yStatVar.statVar].add(facetId);
    }
  }

  for (const place in xPlacePointStat) {
    const namedPlace = {
      dcid: place,
      name: rawData.placeNames[place] || place,
    };
    // get place chart data with no per capita or scaling.
    const placeChartData = getPlaceScatterData(
      namedPlace,
      xPlacePointStat,
      yPlacePointStat,
      rawData.denomsByFacet,
      rawData.defaultDenomData,
      rawData.placeStats.facets
    );
    if (!placeChartData) {
      console.log(
        `SCATTER: no data ${xStatVar} / ${yStatVar} for ${place}. skipping.`
      );
      continue;
    }
    placeChartData.sources.forEach((source) => {
      if (!_.isEmpty(source)) {
        sources.add(source);
      }
    });
    const point = placeChartData.point;

    // Update date range for the x and y start vars
    updateStatVarFacetDateRange(
      statVarFacetDateRanges,
      xStatVar.statVar,
      xPlacePointStat[place].facet,
      point.xDate
    );
    updateStatVarFacetDateRange(
      statVarFacetDateRanges,
      yStatVar.statVar,
      yPlacePointStat[place].facet,
      point.yDate
    );

    if (xStatVar.denom) {
      const xPlaceFacet = xPlacePointStat[place].facet;
      const denomInfo = getDenomInfo(
        xStatVar,
        rawData.denomsByFacet,
        place,
        point.xDate,
        xPlaceFacet,
        rawData.defaultDenomData
      );
      if (!denomInfo) {
        // skip this data point because missing denom data.
        continue;
      }
      point.xVal /= denomInfo.value;
      point.xPopDate = denomInfo.date;
      point.xPopVal = denomInfo.value;
      sources.add(denomInfo.source);
      const xDenomStatVar = xStatVar.denom;
      if (denomInfo.facetId && denomInfo.facet) {
        facets[denomInfo.facetId] = denomInfo.facet;
        if (!statVarToFacets[xDenomStatVar]) {
          statVarToFacets[xDenomStatVar] = new Set<string>();
        }
        statVarToFacets[xDenomStatVar].add(denomInfo.facetId);
      }
      // Update date for the x denominator stat var
      updateStatVarFacetDateRange(
        statVarFacetDateRanges,
        xDenomStatVar,
        denomInfo.facetId,
        denomInfo.date
      );
    }
    if (xUnitScaling.scaling) {
      point.xVal *= xUnitScaling.scaling;
    }
    if (yStatVar.denom) {
      const yPlaceFacet = yPlacePointStat[place].facet;
      const denomInfo = getDenomInfo(
        yStatVar,
        rawData.denomsByFacet,
        place,
        point.yDate,
        yPlaceFacet,
        rawData.defaultDenomData
      );
      if (!denomInfo) {
        // skip this data point because missing denom data.
        continue;
      }
      point.yVal /= denomInfo.value;
      point.yPopDate = denomInfo.date;
      point.yPopVal = denomInfo.value;
      sources.add(denomInfo.source);
      const yDenomStatVar = yStatVar.denom;
      if (denomInfo.facetId && denomInfo.facet) {
        facets[denomInfo.facetId] = denomInfo.facet;
        if (!statVarToFacets[yDenomStatVar]) {
          statVarToFacets[yDenomStatVar] = new Set<string>();
        }
        statVarToFacets[yDenomStatVar].add(denomInfo.facetId);
      }
      // Update date for the y denominator stat var
      updateStatVarFacetDateRange(
        statVarFacetDateRanges,
        yDenomStatVar,
        denomInfo.facetId,
        denomInfo.date
      );
    }
    if (yUnitScaling.scaling) {
      point.yVal *= yUnitScaling.scaling;
    }
    points[place] = point;
    xDates.add(point.xDate);
    yDates.add(point.yDate);
  }
  const errorMsg = _.isEmpty(points)
    ? getNoDataErrorMsg(props.statVarSpec)
    : "";
  return {
    xStatVar,
    yStatVar,
    points,
    sources,
    facets,
    statVarToFacets,
    statVarFacetDateRanges,
    xUnit: xUnitScaling.unit,
    yUnit: yUnitScaling.unit,
    xDate: getDateRange(Array.from(xDates)),
    yDate: getDateRange(Array.from(yDates)),
    errorMsg,
    props,
    xStatVarName,
    yStatVarName,
  };
}

function getTooltipElement(
  point: Point,
  xLabel: string,
  yLabel: string
): ReactElement {
  return (
    <>
      <header>
        <b>{point.place.name || point.place.dcid}</b>
      </header>
      {xLabel} ({point.xDate}): <b>{getStringOrNA(point.xVal)}</b>
      <br />
      {yLabel} ({point.yDate}): <b>{getStringOrNA(point.yVal)}</b>
      <br />
    </>
  );
}

export function draw(
  chartData: ScatterChartData,
  svgContainer: HTMLDivElement,
  svgChartHeight: number,
  tooltip: HTMLDivElement,
  scatterTileSpec: ScatterTileSpec,
  svgWidth?: number,
  chartTitle?: string
): void {
  if (chartData.errorMsg) {
    clearContainer(svgContainer);
    return;
  }
  const width = svgWidth || svgContainer.offsetWidth;
  // TODO (chejennifer): we should not be getting to this state where width is 0
  // and it might have to do with the resize observer. Look into root cause.
  if (!width) {
    return;
  }
  const shouldHighlightQuadrants = {
    [ChartQuadrant.TOP_LEFT]: scatterTileSpec.highlightTopLeft,
    [ChartQuadrant.TOP_RIGHT]: scatterTileSpec.highlightTopRight,
    [ChartQuadrant.BOTTOM_LEFT]: scatterTileSpec.highlightBottomLeft,
    [ChartQuadrant.BOTTOM_RIGHT]: scatterTileSpec.highlightBottomRight,
  };
  const highlightPoints = [
    ChartQuadrant.TOP_LEFT,
    ChartQuadrant.TOP_RIGHT,
    ChartQuadrant.BOTTOM_LEFT,
    ChartQuadrant.BOTTOM_RIGHT,
  ].filter((quadrant) => shouldHighlightQuadrants[quadrant]);
  const plotOptions: ScatterPlotOptions = {
    xPerCapita: !_.isEmpty(chartData.xStatVar.denom),
    yPerCapita: !_.isEmpty(chartData.yStatVar.denom),
    xLog: chartData.xStatVar.log,
    yLog: chartData.yStatVar.log,
    showQuadrants: scatterTileSpec.showQuadrants,
    showDensity: true,
    showPopulation: SHOW_POPULATION_OFF,
    showLabels: scatterTileSpec.showPlaceLabels,
    showRegression: false,
    highlightPoints,
  };
  const plotProperties: ScatterPlotProperties = {
    width,
    height: svgChartHeight,
    xLabel: chartData.xStatVarName,
    yLabel: chartData.yStatVarName,
    xUnit: chartData.xUnit,
    yUnit: chartData.yUnit,
  };
  drawScatter(
    svgContainer,
    tooltip,
    plotProperties,
    plotOptions,
    chartData.points,
    _.noop,
    getTooltipElement,
    chartTitle
  );
}

function getExploreLink(props: ScatterTilePropType): {
  displayText: string;
  url: string;
} {
  const displayOptions = {
    scatterPlaceLables: props.scatterTileSpec.showPlaceLabels,
    scatterQuadrants: props.scatterTileSpec.showQuadrants,
  };
  const hash = getHash(
    VisType.SCATTER,
    [props.place.dcid],
    props.enclosedPlaceType,
    props.statVarSpec.slice(0, 2).map((svSpec) => getContextStatVar(svSpec)),
    displayOptions
  );
  return {
    displayText: intl.formatMessage(messages.scatterTool),
    url: `${props.apiRoot || ""}${URL_PATH}#${hash}`,
  };
}
