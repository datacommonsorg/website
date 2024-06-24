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

import {
  DataCommonsClient,
  isDateInRange,
  ISO_CODE_ATTRIBUTE,
} from "@datacommonsorg/client";
import _ from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { VisType } from "../../apps/visualization/vis_type_configs";
import { DataGroup, DataPoint, expandDataPoints } from "../../chart/base";
import { drawLineChart } from "../../chart/draw_line";
import { TimeScaleOption } from "../../chart/types";
import { URL_PATH } from "../../constants/app/visualization_constants";
import { CSV_FIELD_DELIMITER } from "../../constants/tile_constants";
import { useLazyLoad } from "../../shared/hooks";
import { SeriesApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { computeRatio } from "../../tools/shared_util";
import {
  getContextStatVar,
  getHash,
} from "../../utils/app/visualization_utils";
import {
  getBestUnit,
  getSeries,
  getSeriesWithin,
} from "../../utils/data_fetch_utils";
import { getPlaceNames } from "../../utils/place_utils";
import { getUnit } from "../../utils/stat_metadata_utils";
import {
  getNoDataErrorMsg,
  getStatFormat,
  getStatVarNames,
  ReplacementStrings,
  showError,
  transformCsvHeader,
} from "../../utils/tile_utils";
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
}

export interface LineChartData {
  dataGroup: DataGroup[];
  sources: Set<string>;
  unit: string;
  // props used when fetching this data
  props: LineTilePropType;
  errorMsg: string;
}

export function LineTile(props: LineTilePropType): JSX.Element {
  const svgContainer = useRef(null);
  const [chartData, setChartData] = useState<LineChartData | undefined>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { shouldLoad, containerRef } = useLazyLoad(props.lazyLoadMargin);
  useEffect(() => {
    if (props.lazyLoad && !shouldLoad) {
      return;
    }
    if (!chartData || !_.isEqual(chartData.props, props)) {
      (async () => {
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
  return (
    <ChartTileContainer
      allowEmbed={true}
      apiRoot={props.apiRoot}
      className={`${props.className} line-chart`}
      exploreLink={props.showExploreMore ? getExploreLink(props) : null}
      footnote={props.footnote}
      getDataCsv={getDataCsvCallback(props)}
      hasErrorMsg={chartData && !!chartData.errorMsg}
      id={props.id}
      isInitialLoading={_.isNull(chartData)}
      isLoading={isLoading}
      replacementStrings={getReplacementStrings(props)}
      sources={props.sources || (chartData && chartData.sources)}
      subtitle={props.subtitle}
      title={props.title}
      statVarSpecs={props.statVarSpec}
      forwardRef={containerRef}
    >
      <div
        id={props.id}
        className="svg-container"
        ref={svgContainer}
        style={{ minHeight: props.svgChartHeight }}
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
  const dataCommonsClient = new DataCommonsClient({ apiRoot: props.apiRoot });
  return () => {
    const perCapitaVariables = props.statVarSpec
      .filter((v) => v.denom)
      .map((v) => v.statVar);
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
        perCapitaVariables,
        startDate: props.startDate,
        transformHeader: transformCsvHeader,
        variables: props.statVarSpec.map((v) => v.statVar),
      });
    } else {
      const entities = getPlaceDcids(props);
      return dataCommonsClient.getCsvSeries({
        endDate: props.endDate,
        entities,
        entityProps,
        fieldDelimiter: CSV_FIELD_DELIMITER,
        perCapitaVariables: _.uniq(perCapitaVariables),
        startDate: props.startDate,
        transformHeader: transformCsvHeader,
        variables: props.statVarSpec.map((v) => v.statVar),
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
function getPlaceDcids(props: LineTilePropType) {
  return props.comparisonPlaces && props.comparisonPlaces.length > 0
    ? props.comparisonPlaces
    : [props.place.dcid];
}

// Get the ReplacementStrings object used for formatting the title
export function getReplacementStrings(
  props: LineTilePropType
): ReplacementStrings {
  return {
    placeName: props.place ? props.place.name : "",
  };
}

export const fetchData = async (props: LineTilePropType) => {
  const facetToVariable = { [EMPTY_FACET_ID_KEY]: [] };
  for (const spec of props.statVarSpec) {
    const facetId = spec.facetId || EMPTY_FACET_ID_KEY;
    if (!facetToVariable[facetId]) {
      facetToVariable[facetId] = [];
    }
    facetToVariable[facetId].push(spec.statVar);
    if (spec.denom) {
      facetToVariable[EMPTY_FACET_ID_KEY].push(spec.denom);
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
          facetIds
        )
      );
    } else {
      const placeDcids = getPlaceDcids(props);
      dataPromises.push(
        getSeries(props.apiRoot, placeDcids, facetToVariable[facetId], facetIds)
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
  return rawToChart(resp, props, placeNames, statVarNames, options);
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
    showError(chartData.errorMsg, svgContainer);
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
  options: { usePlaceLabels: boolean; useBothLabels: boolean }
): LineChartData {
  // (TODO): We assume the index of numerator and denominator matches.
  // This is brittle and should be updated in the protobuf that binds both
  // together.
  const raw = _.cloneDeep(rawData);
  const dataGroups: DataGroup[] = [];
  const sources = new Set<string>();
  const allDates = new Set<string>();
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
      if (spec.denom) {
        const denomSeries = raw.data[spec.denom][placeDcid];
        obsList = computeRatio(obsList, denomSeries.series);
      }
      if (obsList.length > 0) {
        const dataPoints: DataPoint[] = [];
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
        }
        const label = options.useBothLabels
          ? `${statVarDcidToName[spec.statVar]} for ${
              placeDcidToName[placeDcid]
            }`
          : options.usePlaceLabels
          ? placeDcidToName[placeDcid]
          : statVarDcidToName[spec.statVar];
        dataGroups.push(new DataGroup(label, dataPoints));
        sources.add(raw.facets[series.facet].provenanceUrl);
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
    unit,
    props,
    errorMsg,
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
    displayText: "Timeline Tool",
    url: `${props.apiRoot || ""}${URL_PATH}#${hash}`,
  };
}
