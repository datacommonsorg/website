/**
 * Copyright 2021 Google LLC
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
 * Component for rendering a line type tile.
 */

import { isDateInRange, ISO_CODE_ATTRIBUTE } from "@datacommonsorg/client";
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
import { DataGroup, DataPoint, expandDataPoints } from "../../chart/base";
import { drawLineChart } from "../../chart/draw_line";
import { TimeScaleOption } from "../../chart/types";
import { URL_PATH } from "../../constants/app/visualization_constants";
import { CSV_FIELD_DELIMITER } from "../../constants/tile_constants";
import { intl } from "../../i18n/i18n";
import { messages } from "../../i18n/i18n_messages";
import { useLazyLoad } from "../../shared/hooks";
import {
  buildObservationSpecs,
  ObservationSpec,
  ObservationSpecOptions,
} from "../../shared/observation_specs";
import { SeriesApiResponse, StatMetadata } from "../../shared/stat_types";
import {
  NamedTypedPlace,
  StatVarFacetMap,
  StatVarSpec,
} from "../../shared/types";
import { computeRatio } from "../../tools/shared_util";
import { FacetSelectionCriteria } from "../../types/facet_selection_criteria";
import {
  getContextStatVar,
  getHash,
} from "../../utils/app/visualization_utils";
import { getDataCommonsClient } from "../../utils/data_commons_client";
import {
  getBestUnit,
  getSeries,
  getSeriesWithin,
} from "../../utils/data_fetch_utils";
import { getPlaceNames } from "../../utils/place_utils";
import { getUnit } from "../../utils/stat_metadata_utils";
import {
  clearContainer,
  getDenomResp,
  getNoDataErrorMsg,
  getStatFormat,
  getStatVarNames,
  ReplacementStrings,
  StatVarFacetDateRangeMap,
  transformCsvHeader,
  updateStatVarFacetDateRange,
} from "../../utils/tile_utils";
import { buildExploreUrl } from "../../utils/url_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

const EMPTY_FACET_ID_KEY = "empty";

export interface LineTilePropType {
  // API root
  apiRoot?: string;
  // Extra classes to add to the container.
  className?: string;
  // colors to use
  colors?: string[];
  // List of place DCIDs to plot, instead of enclosedPlaceType in place
  comparisonPlaces?: string[];
  // Type of child places to plot
  enclosedPlaceType?: string;
  // Text to show in footer
  footnote?: string;
  id: string;
  // Whether or not to render the data version of this tile
  isDataTile?: boolean;
  title: string;
  place: NamedTypedPlace;
  statVarSpec: StatVarSpec[];
  // Height, in px, for the SVG chart.
  svgChartHeight: number;
  // Width, in px, for the SVG chart.
  svgChartWidth?: number;
  // Whether or not to show the explore more button.
  showExploreMore?: boolean;
  // Whether to show tooltip on hover
  showTooltipOnHover?: boolean;
  // Function used to get processed stat var names.
  getProcessedSVNameFn?: (name: string) => string;
  // Time scale to use on x-axis. "year", "month", or "day"
  timeScale?: TimeScaleOption;
  // The property to use to get place names.
  placeNameProp?: string;
  // Chart subtitle
  subtitle?: string;
  // Earliest date to show on the chart.
  startDate?: string;
  // Latest date to show on the chart.
  endDate?: string;
  // Date to highlight on the chart.
  highlightDate?: string;
  // Optional: Override sources for this tile
  sources?: string[];
  // Optional: only load this component when it's near the viewport
  lazyLoad?: boolean;
  /**
   * Optional: If lazy loading is enabled, load the component when it is within
   * this margin of the viewport. Default: "0px"
   */
  lazyLoadMargin?: string;
  // Metadata for the facet to highlight.
  facetSelector?: FacetSelectionCriteria;
  // Optional: Passed into mixer calls to differentiate website and web components in usage logs
  surface?: string;
}

export interface LineChartData {
  dataGroup: DataGroup[];
  // A set of string sources (URLs)
  sources: Set<string>;
  // A full set of the facets used within the chart
  facets: Record<string, StatMetadata>;
  // A mapping of which stat var used which facets
  statVarToFacets: StatVarFacetMap;
  // A map of stat var dcids to facet IDs to their specific min and max date range from the chart
  statVarFacetDateRanges?: StatVarFacetDateRangeMap;
  unit: string;
  // props used when fetching this data
  props: LineTilePropType;
  errorMsg: string;
}

export function LineTile(props: LineTilePropType): ReactElement {
  const svgContainer = useRef(null);
  const [chartData, setChartData] = useState<LineChartData | undefined>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { shouldLoad, containerRef } = useLazyLoad(props.lazyLoadMargin);
  useEffect(() => {
    if (props.lazyLoad && !shouldLoad) {
      return;
    }
    if (!chartData || !_.isEqual(chartData.props, props)) {
      (async (): Promise<void> => {
        try {
          setIsLoading(true);
          const data = await fetchData(props);
          if (props && _.isEqual(data.props, props)) {
            setChartData(data);
          }
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [props, chartData, shouldLoad]);

  const drawFn = useCallback(() => {
    if (_.isEmpty(chartData)) {
      return;
    }
    draw(props, chartData, svgContainer.current);
  }, [props, chartData]);

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
    if (!chartData) {
      return undefined;
    }
    return (): ObservationSpec[] => {
      const options: ObservationSpecOptions = {
        statVarSpecs: props.statVarSpec,
        statVarToFacets: chartData.statVarToFacets,
      };
      if (props.enclosedPlaceType) {
        options.entityExpression = `${props.place.dcid}<-containedInPlace+{typeOf:${props.enclosedPlaceType}}`;
      } else {
        options.placeDcids =
          props.comparisonPlaces && props.comparisonPlaces.length > 0
            ? props.comparisonPlaces
            : [props.place.dcid];
      }

      return buildObservationSpecs(options);
    };
  }, [
    chartData,
    props.statVarSpec,
    props.enclosedPlaceType,
    props.place,
    props.comparisonPlaces,
  ]);

  return (
    <ChartTileContainer
      allowEmbed={true}
      apiRoot={props.apiRoot}
      className={`${props.className} line-chart`}
      exploreLink={props.showExploreMore ? getExploreLink(props) : null}
      hyperlink={getHyperlinkFn(props, chartData)}
      footnote={props.footnote}
      getDataCsv={getDataCsvCallback(props)}
      getObservationSpecs={getObservationSpecs}
      errorMsg={chartData && chartData.errorMsg}
      id={props.id}
      isInitialLoading={_.isNull(chartData)}
      isLoading={isLoading}
      replacementStrings={getReplacementStrings(props, chartData)}
      sources={props.sources || (chartData && chartData.sources)}
      facets={chartData?.facets}
      statVarToFacets={chartData?.statVarToFacets}
      statVarFacetDateRanges={chartData?.statVarFacetDateRanges}
      subtitle={props.subtitle}
      title={props.title}
      statVarSpecs={props.statVarSpec}
      forwardRef={containerRef}
      surface={props.surface}
    >
      <div
        id={props.id}
        className="svg-container"
        ref={svgContainer}
        style={{
          minHeight: props.svgChartHeight,
          display: chartData && chartData.errorMsg ? "none" : "block",
        }}
      ></div>
    </ChartTileContainer>
  );
}

/**
 * Returns callback for fetching chart CSV data
 * @param props Chart properties
 * @returns Async function for fetching chart CSV
 */
function getDataCsvCallback(props: LineTilePropType): () => Promise<string> {
  const dataCommonsClient = getDataCommonsClient(props.apiRoot, props.surface);
  return () => {
    const entityProps = props.placeNameProp
      ? [props.placeNameProp, ISO_CODE_ATTRIBUTE]
      : undefined;
    if (props.enclosedPlaceType) {
      return dataCommonsClient.getCsvSeries({
        childType: props.enclosedPlaceType,
        endDate: props.endDate,
        entityProps,
        fieldDelimiter: CSV_FIELD_DELIMITER,
        parentEntity: props.place.dcid,
        startDate: props.startDate,
        transformHeader: transformCsvHeader,
        statVarSpecs: props.statVarSpec,
        variables: [],
      });
    } else {
      const entities = getPlaceDcids(props);
      return dataCommonsClient.getCsvSeries({
        endDate: props.endDate,
        entities,
        entityProps,
        fieldDelimiter: CSV_FIELD_DELIMITER,
        startDate: props.startDate,
        transformHeader: transformCsvHeader,
        statVarSpecs: props.statVarSpec,
        variables: [],
      });
    }
  };
}

/**
 * Returns list of comparison places or a list with just the specified place
 * dcid
 *
 * @param props LineTile props
 * @returns Array of place dcids
 */
function getPlaceDcids(props: LineTilePropType): string[] {
  return props.comparisonPlaces && props.comparisonPlaces.length > 0
    ? props.comparisonPlaces
    : [props.place.dcid];
}

// TODO(gmechali): Unify fetching latest data for all tiles.
/**
 * Returns the latest year found in the chart data.
 *
 * @param chartData Line chart data
 * @returns Latest year with data.
 */
const getLatestDate = (chartData: LineChartData): string | null => {
  if (!chartData || !chartData.dataGroup) {
    return null;
  }

  const years = chartData?.dataGroup
    .flatMap((g) => g.value || [])
    .map((p) => {
      const date = p && p.time ? new Date(p.time) : null;
      return date ? date.getUTCFullYear() : null;
    })
    .filter((year) => year !== null);

  if (years.length > 0) {
    years.sort();
    return years.pop().toString();
  }
  return null;
};

// Get the ReplacementStrings object used for formatting the title
export function getReplacementStrings(
  props: LineTilePropType,
  chartData: LineChartData
): ReplacementStrings {
  return {
    placeName: props.place ? props.place.name : "",
    date: getLatestDate(chartData),
  };
}

export const fetchData = async (
  props: LineTilePropType
): Promise<LineChartData> => {
  const facetToVariable = { [EMPTY_FACET_ID_KEY]: [] };
  const denoms = [];
  for (const spec of props.statVarSpec) {
    const facetId = spec.facetId || EMPTY_FACET_ID_KEY;
    if (!facetToVariable[facetId]) {
      facetToVariable[facetId] = [];
    }
    facetToVariable[facetId].push(spec.statVar);
    if (spec.denom) {
      denoms.push(spec.denom);
    }
  }

  const dataPromises: Promise<SeriesApiResponse>[] = [];
  for (const facetId of Object.keys(facetToVariable)) {
    if (_.isEmpty(facetToVariable[facetId])) {
      continue;
    }
    let facetIds = null;
    if (facetId !== EMPTY_FACET_ID_KEY) {
      facetIds = [facetId];
    }
    if (props.enclosedPlaceType) {
      dataPromises.push(
        getSeriesWithin(
          props.apiRoot,
          props.place.dcid,
          props.enclosedPlaceType,
          facetToVariable[facetId],
          facetIds,
          props.surface
        )
      );
    } else {
      const placeDcids = getPlaceDcids(props);
      // Note that for now there are two ways to select the facet, via facetIds or highlightFacet. At most only one should be provided.
      dataPromises.push(
        getSeries(
          props.apiRoot,
          placeDcids,
          facetToVariable[facetId],
          facetIds,
          props.facetSelector,
          props.surface
        )
      );
    }
  }

  const dataPromise: Promise<SeriesApiResponse> = Promise.all(
    dataPromises
  ).then((statResponses) => {
    const mergedResponse = { data: {}, facets: {} };
    statResponses.forEach((resp) => {
      mergedResponse.data = Object.assign(mergedResponse.data, resp.data);
      mergedResponse.facets = Object.assign(mergedResponse.facets, resp.facets);
    });
    return mergedResponse;
  });
  const resp = await dataPromise;

  // get place names from dcids
  const placeDcids = Object.keys(resp.data[props.statVarSpec[0].statVar]);
  const statVarNames = await getStatVarNames(
    props.statVarSpec,
    props.apiRoot,
    props.getProcessedSVNameFn
  );
  const placeNames = await getPlaceNames(placeDcids, {
    apiRoot: props.apiRoot,
    prop: props.placeNameProp,
  });
  // How legend labels should be set
  // If neither options are set, default to showing stat vars in legend labels
  const options = {
    // If many places and one stat var, legend should show only place labels
    usePlaceLabels: props.statVarSpec.length == 1 && placeDcids.length > 1,
    // If many places and many stat vars, legends need to show both
    useBothLabels: props.statVarSpec.length > 1 && placeDcids.length > 1,
  };

  // get denom info
  const [denomsByFacet, defaultDenomData] = await getDenomResp(
    denoms,
    resp,
    props.apiRoot,
    !!props.enclosedPlaceType,
    props.surface,
    !props.enclosedPlaceType ? getPlaceDcids(props) : [],
    props.enclosedPlaceType ? props.place.dcid : "",
    props.enclosedPlaceType
  );
  return rawToChart(
    resp,
    props,
    placeNames,
    statVarNames,
    options,
    denomsByFacet,
    defaultDenomData
  );
};

export function draw(
  props: LineTilePropType,
  chartData: LineChartData,
  svgContainer: HTMLDivElement,
  useSvgLegend?: boolean,
  chartTitle?: string
): void {
  // TODO: Remove all cases of setting innerHTML directly.
  svgContainer.innerHTML = "";
  if (chartData.errorMsg) {
    clearContainer(svgContainer);
    return;
  }
  const isCompleteLine = drawLineChart(
    svgContainer,
    props.svgChartWidth || svgContainer.offsetWidth,
    props.svgChartHeight,
    chartData.dataGroup,
    props.showTooltipOnHover,
    {
      colors: props.colors,
      highlightDate: props.highlightDate,
      timeScale: props.timeScale,
      title: chartTitle,
      unit: chartData.unit,
      useSvgLegend,
    }
  );
  if (!isCompleteLine) {
    svgContainer.querySelectorAll(".dotted-warning")[0].className +=
      " d-inline";
  }
}

function rawToChart(
  rawData: SeriesApiResponse,
  props: LineTilePropType,
  placeDcidToName: Record<string, string>,
  statVarDcidToName: Record<string, string>,
  options: { usePlaceLabels: boolean; useBothLabels: boolean },
  denomsByFacet: Record<string, SeriesApiResponse>,
  defaultDenomData: SeriesApiResponse
): LineChartData {
  // (TODO): We assume the index of numerator and denominator matches.
  // This is brittle and should be updated in the protobuf that binds both
  // together.
  const raw = _.cloneDeep(rawData);
  const dataGroups: DataGroup[] = [];
  const sources = new Set<string>();
  const facets: Record<string, StatMetadata> = {};
  const statVarToFacets: StatVarFacetMap = {};
  const allDates = new Set<string>();
  const statVarFacetDateRanges: StatVarFacetDateRangeMap = {};
  // TODO: make a new wrapper to fetch series data & do the processing there.
  const unit2count = {};
  for (const spec of props.statVarSpec) {
    const entityToSeries = raw.data[spec.statVar];
    for (const placeDcid in entityToSeries) {
      const series = raw.data[spec.statVar][placeDcid];
      const svUnit = getUnit(raw.facets[series.facet]);
      if (!unit2count[svUnit]) {
        unit2count[svUnit] = 0;
      }
      unit2count[svUnit]++;
    }
  }
  const bestUnit = getBestUnit(unit2count);
  // filter stat data to only keep series that use best unit
  for (const spec of props.statVarSpec) {
    for (const place in raw.data[spec.statVar]) {
      const series = raw.data[spec.statVar][place];
      const svUnit = getUnit(raw.facets[series.facet]);
      if (svUnit !== bestUnit) {
        raw.data[spec.statVar][place] = { series: [] };
      }
    }
  }
  // Assume all stat var specs will use the same unit and scaling.
  const { unit, scaling } = getStatFormat(props.statVarSpec[0], null, raw);
  for (const spec of props.statVarSpec) {
    // Do not modify the React state. Create a clone.
    const entityToSeries = raw.data[spec.statVar];
    for (const placeDcid in entityToSeries) {
      const series = raw.data[spec.statVar][placeDcid];
      let obsList = series.series;
      let denomFacetId: string;
      if (spec.denom) {
        let denomInfo = denomsByFacet[series.facet];
        // if the placeDcid is not available in the facet-specific denom, use best available
        if (denomInfo?.data?.[spec.denom]?.[placeDcid]?.series.length <= 0) {
          denomInfo = defaultDenomData;
        }
        const denomSeries = denomInfo?.data?.[spec.denom]?.[placeDcid];
        obsList = computeRatio(obsList, denomSeries.series);
        if (denomSeries?.facet) {
          // if denom facet is never used in numerator, we need to get the source from the denom info
          const facetInfo =
            raw.facets[denomSeries.facet] ??
            denomInfo?.facets[denomSeries.facet];
          sources.add(facetInfo.provenanceUrl);
          facets[denomSeries.facet] = facetInfo;
          if (!statVarToFacets[spec.denom]) {
            statVarToFacets[spec.denom] = new Set<string>();
          }
          statVarToFacets[spec.denom].add(denomSeries.facet);
        }
        denomFacetId = denomSeries?.facet;
      }
      if (obsList.length > 0) {
        const dataPoints: DataPoint[] = [];
        const currentSvDates = new Set<string>();
        for (const obs of obsList) {
          if (!isDateInRange(obs.date, props.startDate, props.endDate)) {
            continue;
          }
          dataPoints.push({
            label: obs.date,
            time: new Date(obs.date).getTime(),
            value: scaling ? obs.value * scaling : obs.value,
          });
          allDates.add(obs.date);
          currentSvDates.add(obs.date);
        }

        currentSvDates.forEach((date) => {
          updateStatVarFacetDateRange(
            statVarFacetDateRanges,
            spec.statVar,
            series.facet,
            date
          );
          if (spec.denom && denomFacetId) {
            updateStatVarFacetDateRange(
              statVarFacetDateRanges,
              spec.denom,
              denomFacetId,
              date
            );
          }
        });

        const label = options.useBothLabels
          ? `${statVarDcidToName[spec.statVar]} for ${
              placeDcidToName[placeDcid]
            }`
          : options.usePlaceLabels
          ? placeDcidToName[placeDcid]
          : statVarDcidToName[spec.statVar];
        dataGroups.push(new DataGroup(label, dataPoints));
        sources.add(raw.facets[series.facet].provenanceUrl);
        facets[series.facet] = raw.facets[series.facet];
        if (!statVarToFacets[spec.statVar]) {
          statVarToFacets[spec.statVar] = new Set<string>();
        }
        statVarToFacets[spec.statVar].add(series.facet);
      }
    }
  }
  for (let i = 0; i < dataGroups.length; i++) {
    dataGroups[i].value = expandDataPoints(dataGroups[i].value, allDates);
  }

  const errorMsg = _.isEmpty(dataGroups)
    ? getNoDataErrorMsg(props.statVarSpec)
    : "";
  return {
    dataGroup: dataGroups,
    sources,
    facets,
    statVarToFacets,
    unit,
    props,
    errorMsg,
    statVarFacetDateRanges,
  };
}

function getExploreLink(props: LineTilePropType): {
  displayText: string;
  url: string;
} {
  const hash = getHash(
    VisType.TIMELINE,
    getPlaceDcids(props),
    "",
    props.statVarSpec.map((spec) => getContextStatVar(spec)),
    {}
  );
  return {
    displayText: intl.formatMessage(messages.timelineTool),
    url: `${props.apiRoot || ""}${URL_PATH}#${hash}`,
  };
}

function getHyperlinkFn(
  props: LineTilePropType,
  chartData?: LineChartData
): string {
  if (!props.place) {
    return ""; // Or null, depending on how ChartTileContainer handles it
  }
  const placeDcids = getPlaceDcids(props);
  let facetMetadata: StatMetadata = undefined;
  if (chartData && chartData.statVarToFacets && chartData.facets) {
    const firstVar = props.statVarSpec[0].statVar;
    const facetIds = chartData.statVarToFacets[firstVar];
    if (facetIds && facetIds.size > 0) {
      const firstFacetId = Array.from(facetIds)[0];
      facetMetadata = chartData.facets[firstFacetId];
    }
  }
  if (
    !facetMetadata &&
    props.facetSelector &&
    props.facetSelector.facetMetadata
  ) {
    facetMetadata = props.facetSelector.facetMetadata;
  }
  return buildExploreUrl(
    "TIMELINE_WITH_HIGHLIGHT",
    placeDcids,
    props.statVarSpec,
    facetMetadata
  );
}
