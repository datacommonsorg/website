/**
 * Copyright 2020 Google LLC
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
 * Component for retrieving and transforming data into a form ready for plotting
 * and passing the data to a `Chart` component that plots the scatter plot.
 */

import { dataRowsToCsv } from "@datacommonsorg/client";
import _ from "lodash";
import React, {
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Point } from "../../chart/draw_scatter";
import { CSV_FIELD_DELIMITER } from "../../constants/tile_constants";
import { ChartEmbed } from "../../place/chart_embed";
import {
  DEFAULT_POPULATION_DCID,
  WEBSITE_SURFACE,
} from "../../shared/constants";
import { FacetSelectorFacetInfo } from "../../shared/facet_selector/facet_selector";
import {
  buildObservationSpecs,
  ObservationSpec,
} from "../../shared/observation_specs";
import {
  EntityObservation,
  EntityObservationList,
  PointAllApiResponse,
  PointApiResponse,
  SeriesApiResponse,
  StatMetadata,
} from "../../shared/stat_types";
import { StatVarFacetMap, StatVarSpec } from "../../shared/types";
import { getCappedStatVarDate, saveToFile } from "../../shared/util";
import { scatterDataToCsv } from "../../utils/chart_csv_utils";
import { getDataCommonsClient } from "../../utils/data_commons_client";
import { FacetResponse, getSeriesWithin } from "../../utils/data_fetch_utils";
import { getPlaceScatterData } from "../../utils/scatter_data_utils";
import { getMergedSvg, transformCsvHeader } from "../../utils/tile_utils";
import { Chart } from "./chart";
import { useFacetMetadata } from "./compute/facet_metadata";
import {
  Axis,
  AxisWrapper,
  Context,
  IsLoadingWrapper,
  PlaceInfo,
} from "./context";
import {
  getStatAllWithinPlace,
  getStatWithinPlace,
  ScatterChartType,
} from "./util";

type Cache = {
  // key here is stat var.
  statVarsData: Record<string, EntityObservation>;
  allStatVarsData: Record<string, EntityObservationList>;
  metadataMap: Record<string, StatMetadata>;
  baseFacets: FacetResponse;
  populationData: SeriesApiResponse;
  noDataError: boolean;
  error: boolean;
  xAxis: Axis;
  yAxis: Axis;
  place: PlaceInfo;
};

type ChartData = {
  points: { [placeDcid: string]: Point };
  sources: Set<string>;
  xUnit: string;
  yUnit: string;
};

export function ChartLoader(): ReactElement {
  const { x, y, place, display } = useContext(Context);
  const cache = useCache();
  const chartData = useChartData(cache);

  const { facetSelectorMetadata, facetListLoading, facetListError } =
    useFacetMetadata(cache?.baseFacets || null);

  const containerRef = useRef<HTMLDivElement>(null);
  const embedModalElement = useRef<ChartEmbed>(null);

  const xVal = x.value;
  const yVal = y.value;
  const shouldRenderChart =
    areStatVarInfoLoaded(xVal, yVal) && !_.isEmpty(chartData);

  /**
   * The stat var specs for the current chart configuration.
   */
  const currentStatVarSpecs: StatVarSpec[] = useMemo(() => {
    if (!xVal.statVarDcid || !yVal.statVarDcid) return [];
    return [
      {
        statVar: xVal.statVarDcid,
        denom: xVal.perCapita ? xVal.denom : undefined,
        unit: chartData?.xUnit || undefined,
        scaling: undefined,
        log: xVal.log,
        name: xVal.statVarInfo?.title || xVal.statVarDcid,
        facetId: xVal.metahash || undefined,
        date: xVal.date || undefined,
      },
      {
        statVar: yVal.statVarDcid,
        denom: yVal.perCapita ? yVal.denom : undefined,
        unit: chartData?.yUnit || undefined,
        scaling: undefined,
        log: yVal.log,
        name: yVal.statVarInfo?.title || yVal.statVarDcid,
        facetId: yVal.metahash || undefined,
        date: yVal.date || undefined,
      },
    ];
  }, [xVal, yVal, chartData]);

  /**
   * Convert facet metadata and mappings (derived from the chart store) into a format
   * to be used for citation display in the embed modal.
   */
  const { facets, statVarToFacets } = useMemo(() => {
    const facets: Record<string, StatMetadata> = {};
    const statVarToFacets: StatVarFacetMap = {};

    if (!cache) return { facets, statVarToFacets };

    // We create the facet map from the cache's metadataMap.
    if (cache.metadataMap) {
      for (const facetId in cache.metadataMap) {
        facets[facetId] = cache.metadataMap[facetId];
      }
    }

    // We then build the statVar to facet mapping from baseFacets.
    if (cache.baseFacets) {
      for (const statVarDcid in cache.baseFacets) {
        if (!statVarToFacets[statVarDcid]) {
          statVarToFacets[statVarDcid] = new Set();
        }
        for (const facetId in cache.baseFacets[statVarDcid]) {
          statVarToFacets[statVarDcid].add(facetId);
        }
      }
    }

    return { facets, statVarToFacets };
  }, [cache]);

  /**
   * Callback function for building observation specifications.
   * This is used by the API dialog to generate API calls (e.g., cURL
   * commands) for the user.
   *
   * @returns An array of `ObservationSpec` objects.
   */
  const getObservationSpecs = useCallback((): ObservationSpec[] => {
    if (
      currentStatVarSpecs.length === 0 ||
      !place.value.enclosingPlace.dcid ||
      !place.value.enclosedPlaceType
    ) {
      return [];
    }

    const entityExpression = `${place.value.enclosingPlace.dcid}<-containedInPlace+{typeOf:${place.value.enclosedPlaceType}}`;

    const specsWithDate = currentStatVarSpecs.map((spec) => ({
      ...spec,
      date: getCappedStatVarDate(spec.statVar, spec.date) || "LATEST",
    }));

    return buildObservationSpecs({
      statVarSpecs: specsWithDate,
      statVarToFacets,
      entityExpression,
    });
  }, [
    currentStatVarSpecs,
    place.value.enclosingPlace.dcid,
    place.value.enclosedPlaceType,
    statVarToFacets,
  ]);

  /**
   * Returns callback for fetching chart CSV data.
   * @returns A promise that resolves to chart CSV data.
   */
  const getDataCsv = useCallback(async (): Promise<string> => {
    // Assume both variables will have the same date
    /*
     TODO (nick-next): Update getDataCsv to handle different dates for different variables
        see also scatter_tile.tsx.
     */
    if (
      currentStatVarSpecs.length === 0 ||
      !place.value.enclosingPlace.dcid ||
      !place.value.enclosedPlaceType
    ) {
      return "";
    }

    const dataCommonsClient = getDataCommonsClient();
    const date = getCappedStatVarDate(
      currentStatVarSpecs[0].statVar,
      currentStatVarSpecs[0].date
    );

    const rows = await dataCommonsClient.getDataRows({
      childType: place.value.enclosedPlaceType,
      date,
      parentEntity: place.value.enclosingPlace.dcid,
      variables: [],
      statVarSpecs: currentStatVarSpecs,
    });

    return dataRowsToCsv(rows, CSV_FIELD_DELIMITER, transformCsvHeader);
  }, [
    currentStatVarSpecs,
    place.value.enclosingPlace.dcid,
    place.value.enclosedPlaceType,
  ]);

  /**
   * Shows the chart embed (download) modal.
   */
  const handleEmbed = useCallback((): void => {
    if (!embedModalElement.current || !containerRef.current) return;

    const { svgXml, height, width } = getMergedSvg(containerRef.current);
    embedModalElement.current.show(
      svgXml,
      getDataCsv,
      width,
      height,
      "",
      "",
      "",
      chartData?.sources ? Array.from(chartData.sources) : [],
      WEBSITE_SURFACE
    );
  }, [getDataCsv, chartData?.sources]);

  if (!shouldRenderChart) {
    return <></>;
  }

  const xFacetInfo = getFacetInfo(
    xVal,
    facetSelectorMetadata[xVal.statVarDcid]
  );
  const yFacetInfo = getFacetInfo(
    yVal,
    facetSelectorMetadata[yVal.statVarDcid]
  );
  const onSvFacetIdUpdated = (update): void => {
    for (const sv of Object.keys(update)) {
      if (x.value.statVarDcid === sv) {
        x.setMetahash(update[sv]);
      } else if (y.value.statVarDcid === sv) {
        y.setMetahash(update[sv]);
      }
    }
  };
  return (
    <div ref={containerRef}>
      {shouldRenderChart && (
        <>
          {cache.noDataError || cache.error || _.isEmpty(chartData.points) ? (
            <div className="error-message">
              Sorry, no data available. Try different stat vars or place
              options.
            </div>
          ) : (
            <>
              <Chart
                points={chartData.points}
                xLabel={getLabel(xVal)}
                yLabel={getLabel(yVal)}
                xLog={xVal.log}
                yLog={yVal.log}
                xPerCapita={xVal.perCapita}
                yPerCapita={yVal.perCapita}
                xUnit={chartData.xUnit}
                yUnit={chartData.yUnit}
                placeInfo={place.value}
                display={display}
                sources={chartData.sources}
                svFacetId={{
                  [x.value.statVarDcid]: x.value.metahash,
                  [y.value.statVarDcid]: y.value.metahash,
                }}
                onSvFacetIdUpdated={onSvFacetIdUpdated}
                facetList={[xFacetInfo, yFacetInfo]}
                facetListLoading={facetListLoading}
                facetListError={facetListError}
                handleEmbed={handleEmbed}
                getObservationSpecs={getObservationSpecs}
                containerRef={containerRef}
              />
              <ChartEmbed
                ref={embedModalElement}
                facets={facets}
                statVarSpecs={currentStatVarSpecs}
                statVarToFacets={statVarToFacets}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Hook that returns a cache containing population and statvar data.
 */
function useCache(): Cache {
  const { x, y, place, isLoading } = useContext(Context);

  const [cache, setCache] = useState(null);

  const xVal = x.value;
  const yVal = y.value;
  const placeVal = place.value;

  /**
   * When statvars, enclosing place, child place type, or any plot options change,
   * re-retreive data.
   */
  useEffect(() => {
    if (
      !isLoading.areDataLoading &&
      !areDataLoaded(cache, xVal, yVal, placeVal)
    ) {
      void loadData(x, y, placeVal, isLoading, setCache);
    }
  }, [xVal, yVal, placeVal]);

  return cache;
}

/**
 * Fills cache with population and statvar data.
 * @param x
 * @param y
 * @param place
 * @param isLoading
 * @param setCache
 */
async function loadData(
  x: AxisWrapper,
  y: AxisWrapper,
  place: PlaceInfo,
  isLoading: IsLoadingWrapper,
  setCache: (cache: Cache) => void
): Promise<void> {
  isLoading.setAreDataLoading(true);
  const statResponsePromise: Promise<PointApiResponse> = getStatWithinPlace(
    place.enclosingPlace.dcid,
    place.enclosedPlaceType,
    [x.value, y.value],
    "", // apiRoot
    WEBSITE_SURFACE
  );
  const statAllResponsePromise: Promise<PointAllApiResponse> =
    getStatAllWithinPlace(
      place.enclosingPlace.dcid,
      place.enclosedPlaceType,
      [x.value, y.value],
      WEBSITE_SURFACE
    );
  const populationSvList = new Set([DEFAULT_POPULATION_DCID]);
  for (const axis of [x.value, y.value]) {
    if (axis.denom) {
      populationSvList.add(axis.denom);
    }
  }
  const populationPromise: Promise<SeriesApiResponse> = getSeriesWithin(
    "",
    place.enclosingPlace.dcid,
    place.enclosedPlaceType,
    Array.from(populationSvList),
    null, // facetIds
    WEBSITE_SURFACE
  );
  try {
    const [statResponse, statAllResponse, populationData] = await Promise.all([
      statResponsePromise,
      statAllResponsePromise,
      populationPromise,
    ]);

    const metadataMap = {
      ...(statResponse.facets || {}),
      ...(statAllResponse.facets || {}),
    };

    const baseFacets: FacetResponse = {};
    const statVars = [x.value.statVarDcid, y.value.statVarDcid];
    for (const sv of statVars) {
      baseFacets[sv] = {};
      if (statAllResponse.data[sv]) {
        for (const placeDcid in statAllResponse.data[sv]) {
          for (const obs of statAllResponse.data[sv][placeDcid]) {
            if (metadataMap[obs.facet]) {
              baseFacets[sv][obs.facet] = metadataMap[obs.facet];
            }
          }
        }
      }
    }

    const allStatVarsData = statAllResponse.data;
    const noDataError =
      _.isEmpty(statResponse.data) ||
      Object.values(statResponse.data).every(_.isEmpty);
    const cache: Cache = {
      allStatVarsData,
      metadataMap,
      baseFacets,
      noDataError,
      error: false,
      populationData,
      statVarsData: statResponse.data,
      xAxis: x.value,
      yAxis: y.value,
      place,
    };
    setCache(cache);
  } catch {
    setCache({
      statVarsData: {},
      allStatVarsData: {},
      metadataMap: {},
      baseFacets: {},
      populationData: null,
      noDataError: true,
      error: true,
      xAxis: x.value,
      yAxis: y.value,
      place,
    });
    alert("Error fetching data.");
  } finally {
    isLoading.setAreDataLoading(false);
  }
}

/**
 * Hook that returns the processed chart data for rendering a scatter chart.
 * @param cache
 */
function useChartData(cache: Cache): ChartData {
  const { x, y, place, display } = useContext(Context);
  const [chartData, setChartData] = useState(null);

  const xVal = x.value;
  const yVal = y.value;
  const placeVal = place.value;

  /**
   * Regenerates chartData after population and statvar data are retrieved
   * and after plot options change.
   */
  useEffect(() => {
    if (
      _.isEmpty(cache) ||
      !areDataLoaded(cache, xVal, yVal, placeVal) ||
      _.isNull(placeVal.enclosedPlaces)
    ) {
      return;
    }
    const chartData = getChartData(xVal, yVal, placeVal, cache);
    setChartData(chartData);

    const downloadButton = document.getElementById("download-link");
    if (downloadButton) {
      downloadButton.style.display = "inline-block";
      downloadButton.onclick = (): void =>
        downloadData(xVal, yVal, placeVal, chartData.points);
    }
  }, [cache, xVal, yVal, placeVal, display.chartType]);

  return chartData;
}

/**
 * Extract data for a given facet from all the facets data.
 *
 * TODO: this can be moved to a shared util module.
 */
function extractFacetData(
  data: EntityObservationList,
  facetId: string
): EntityObservation {
  if (_.isEmpty(facetId)) {
    return null;
  }
  const result = {};
  for (const place in data) {
    for (const obs of data[place]) {
      if (obs.facet === facetId) {
        result[place] = obs;
        break;
      }
    }
  }
  return result;
}

/**
 * Takes fetched data and processes it to be in a form that can be used for
 * rendering the chart component
 * @param x
 * @param y
 * @param place
 * @param chartType
 * @param cache
 */
function getChartData(
  x: Axis,
  y: Axis,
  place: PlaceInfo,
  cache: Cache
): ChartData {
  let xStatData = extractFacetData(
    cache.allStatVarsData[x.statVarDcid],
    x.metahash
  );
  if (_.isEmpty(xStatData)) {
    xStatData = cache.statVarsData[x.statVarDcid];
  }
  let yStatData = extractFacetData(
    cache.allStatVarsData[y.statVarDcid],
    y.metahash
  );
  if (_.isEmpty(yStatData)) {
    yStatData = cache.statVarsData[y.statVarDcid];
  }
  const points = {};
  const sources: Set<string> = new Set();
  let xUnit = "";
  let yUnit = "";
  for (const namedPlace of place.enclosedPlaces) {
    const xDenom = x.perCapita ? x.denom : null;
    const yDenom = y.perCapita ? y.denom : null;
    const placeChartData = getPlaceScatterData(
      namedPlace,
      xStatData,
      yStatData,
      {}, // empty denomByFacet since we only care about the singular populationData here
      cache.populationData,
      cache.metadataMap,
      xDenom,
      yDenom
    );
    if (_.isEmpty(placeChartData)) {
      continue;
    }
    placeChartData.sources.forEach((source) => {
      if (!_.isEmpty(source)) {
        sources.add(source);
      }
    });
    points[namedPlace.dcid] = placeChartData.point;
    xUnit = xUnit || placeChartData.xUnit;
    yUnit = yUnit || placeChartData.yUnit;
  }
  return { points, sources, xUnit, yUnit };
}

function getFacetInfo(
  axis: Axis,
  metadataMapForSv: Record<string, StatMetadata>
): FacetSelectorFacetInfo {
  const metadataMap = metadataMapForSv || {};
  return {
    dcid: axis.statVarDcid,
    metadataMap,
    name: axis.statVarInfo.title || axis.statVarDcid,
  };
}
/**
 * Checks if the stat var info for an axis has been loaded.
 * @param axis
 */
function isStatVarInfoLoaded(axis: Axis): boolean {
  return !_.isNull(axis.statVarInfo);
}

/**
 * Checks if the stat var info for both axes has been loaded.
 */
function areStatVarInfoLoaded(x: Axis, y: Axis): boolean {
  return isStatVarInfoLoaded(x) && isStatVarInfoLoaded(y);
}

/**
 * Checks if the population (for per capita) and statvar data
 * have been loaded for both axes.
 * @param cache
 * @param x
 * @param y
 * @param place
 */
function areDataLoaded(
  cache: Cache,
  x: Axis,
  y: Axis,
  place: PlaceInfo
): boolean {
  if (
    _.isEmpty(cache) ||
    _.isEmpty(cache.xAxis) ||
    _.isEmpty(cache.yAxis) ||
    _.isEmpty(cache.place)
  ) {
    return false;
  }
  const xStatVar = x.statVarDcid;
  const yStatVar = y.statVarDcid;
  return (
    xStatVar in cache.statVarsData &&
    yStatVar in cache.statVarsData &&
    cache.xAxis.date === x.date &&
    cache.yAxis.date === y.date &&
    cache.xAxis.denom === x.denom &&
    cache.yAxis.denom === y.denom &&
    cache.place.enclosingPlace.dcid === place.enclosingPlace.dcid &&
    cache.place.enclosedPlaceType === place.enclosedPlaceType
  );
}

/**
 * Saves data to a CSV file.
 * @param x
 * @param y
 * @param place
 * @param points
 */
function downloadData(
  x: Axis,
  y: Axis,
  place: PlaceInfo,
  points: { [placeDcid: string]: Point }
): void {
  const csv = scatterDataToCsv(
    x.statVarDcid,
    DEFAULT_POPULATION_DCID,
    y.statVarDcid,
    DEFAULT_POPULATION_DCID,
    points
  );

  saveToFile(
    `${x.statVarDcid}+` +
      `${y.statVarDcid}+` +
      `${place.enclosingPlace.name}+` +
      `${place.enclosedPlaceType}.csv`,
    csv
  );
}

/**
 * Gets the label given an axis.
 * @param axis
 */
function getLabel(axis: Axis): string {
  const name = axis.statVarInfo.title || axis.statVarDcid;
  return `${name}${axis.perCapita ? " Per Capita" : ""}`;
}
