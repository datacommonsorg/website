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
 * Component for retrieving and transforming data into a form ready for drawing
 * and passing the data to a `Chart` component that draws the choropleth.
 */

import { dataRowsToCsv } from "@datacommonsorg/client";
import _ from "lodash";
import React, {
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import { CSV_FIELD_DELIMITER } from "../../constants/tile_constants";
import { ChartEmbed } from "../../place/chart_embed";
import { WEBSITE_SURFACE } from "../../shared/constants";
import {
  buildObservationSpecs,
  ObservationSpec,
} from "../../shared/observation_specs";
import { StatMetadata } from "../../shared/stat_types";
import { StatVarFacetMap, StatVarSpec } from "../../shared/types";
import {
  getCappedStatVarDate,
  loadSpinner,
  removeSpinner,
} from "../../shared/util";
import { getDataCommonsClient } from "../../utils/data_commons_client";
import { ENCLOSED_PLACE_TYPE_NAMES } from "../../utils/place_utils";
import { getMergedSvg, transformCsvHeader } from "../../utils/tile_utils";
import { Chart } from "./chart";
import { emptyChartStore } from "./chart_store";
import { useComputeBreadcrumbValues } from "./compute/breadcrumb";
import { useComputeFacetList } from "./compute/facets";
import { useUpdateGeoJson } from "./compute/geojson";
import { useComputeLegendDomain } from "./compute/legend";
import { useComputeMapPointValues } from "./compute/map_point";
import { useComputeMapValueAndDate } from "./compute/map_value_dates";
import { useComputeSampleDates } from "./compute/sample_dates";
import { Context } from "./context";
import { useFetchAllDates } from "./fetcher/all_dates";
import { useFetchAllStat } from "./fetcher/all_stat";
import { useFetchBorderGeoJson } from "./fetcher/border_geojson";
import { useFetchBreadcrumbDenomStat } from "./fetcher/breadcrumb_denom_stat";
import { useFetchBreadcrumbStat } from "./fetcher/breadcrumb_stat";
import { useFetchDefaultStat } from "./fetcher/default_stat";
import { useFetchDenomStat } from "./fetcher/denom_stat";
import { useFetchEuropeanCountries } from "./fetcher/european_countries";
import { useFetchGeoJson } from "./fetcher/geojson";
import { useFetchMapPointCoordinate } from "./fetcher/map_point_coordinate";
import { useFetchMapPointStat } from "./fetcher/map_point_stat";
import { useFetchStatVarSummary } from "./fetcher/stat_var_summary";
import { PlaceDetails } from "./place_details";
import { useRenderReady } from "./ready_hooks";
import { chartStoreReducer, metadataReducer, sourcesReducer } from "./reducer";
import { TimeSlider } from "./time_slider";
import { CHART_LOADER_SCREEN, getRankingLink, shouldShowBorder } from "./util";

export function ChartLoader(): ReactElement {
  // +++++++  Context
  const { dateCtx, placeInfo, statVar, display } = useContext(Context);

  // +++++++  Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const embedModalElement = useRef<ChartEmbed>(null);

  // +++++++  Chart Store
  const [chartStore, dispatchChartStore] = useReducer(
    chartStoreReducer,
    emptyChartStore
  );

  // +++++++  Raw Data
  const europeanCountries = useFetchEuropeanCountries();
  useFetchAllStat(dispatchChartStore);
  useFetchDefaultStat(dispatchChartStore);
  useFetchDenomStat(dispatchChartStore);
  useFetchGeoJson(dispatchChartStore);
  useFetchMapPointCoordinate(dispatchChartStore);
  useFetchMapPointStat(dispatchChartStore);
  useFetchBreadcrumbStat(dispatchChartStore);
  useFetchBreadcrumbDenomStat(chartStore, dispatchChartStore);
  useFetchAllDates(dispatchChartStore);
  useFetchStatVarSummary(dispatchChartStore);
  useFetchBorderGeoJson(dispatchChartStore);

  // +++++++  Dispatcher for computations
  const [sources, dispatchSources] = useReducer(
    sourcesReducer,
    new Set<string>()
  );
  const [metadata, dispatchMetadata] = useReducer(metadataReducer, {});

  // +++++++  Computations
  useUpdateGeoJson(chartStore, dispatchChartStore);
  useComputeBreadcrumbValues(chartStore, dispatchChartStore);
  useComputeMapValueAndDate(
    chartStore,
    dispatchChartStore,
    dispatchSources,
    dispatchMetadata
  );
  useComputeMapPointValues(
    chartStore,
    dispatchChartStore,
    dispatchSources,
    dispatchMetadata
  );
  const {
    facetList,
    facetListLoading,
    facetListError,
    onFacetSelectorModalOpen,
    totalFacetCount,
  } = useComputeFacetList(chartStore);
  const { sampleDates, sampleFacet } = useComputeSampleDates(chartStore);
  const legendDomain = useComputeLegendDomain(chartStore, sampleFacet);

  // +++++++++ Chart is ready to render
  const renderReady = useRenderReady(chartStore);

  // +++++++++ Set legend domain
  useEffect(() => {
    if (!_.isEqual(display.value.domain, legendDomain)) {
      display.setDomain(legendDomain);
    }
  }, [display, legendDomain]);

  useEffect(() => {
    if (
      statVar.value.dcid &&
      placeInfo.value.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType
    ) {
      loadSpinner(CHART_LOADER_SCREEN);
    } else {
      // If there is a spinner on the screen, but one of stat var, enclosing
      // place or enclosed place type becomes empty, we should remove that
      // spinner.
      removeSpinner(CHART_LOADER_SCREEN);
    }
  }, [
    statVar.value.dcid,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
  ]);

  // Functions for handling the logic required for the embed (download) dialog and the API dialog

  /**
   * The stat var spec for the current chart configuration.
   */
  const currentStatVarSpec: StatVarSpec = useMemo(() => {
    if (!statVar.value.dcid) return null;
    return {
      statVar: statVar.value.dcid,
      denom: statVar.value.perCapita ? statVar.value.denom : undefined,
      unit: chartStore.mapValuesDates.data?.unit || undefined,
      scaling: undefined,
      log: false,
      name:
        statVar.value.info?.[statVar.value.dcid]?.title || statVar.value.dcid,
      facetId: statVar.value.metahash || undefined,
    };
  }, [statVar.value, chartStore.mapValuesDates.data?.unit]);

  /**
   * Convert facet metadata and mappings (derived from the facet list) into a format
   * to be used for citation display in the embed modal and footer.
   */
  const { facets, statVarToFacets } = useMemo(() => {
    const facets: Record<string, StatMetadata> = {};
    const statVarToFacets: StatVarFacetMap = {};

    if (facetList) {
      for (const facetInfo of facetList) {
        const svDcid = facetInfo.dcid;

        if (!statVarToFacets[svDcid]) {
          statVarToFacets[svDcid] = new Set();
        }

        // Compile facets that are used in the actual map
        const selectedFacetIds = new Set<string>();

        if (
          svDcid === statVar.value.dcid &&
          chartStore.mapValuesDates.data?.numerFacets
        ) {
          chartStore.mapValuesDates.data.numerFacets.forEach((f) => {
            if (facetInfo.metadataMap[f]) {
              selectedFacetIds.add(f);
            }
          });
        }

        const facetIdsToAdd = Array.from(selectedFacetIds);

        for (const facetId of facetIdsToAdd) {
          statVarToFacets[svDcid].add(facetId);
          facets[facetId] = facetInfo.metadataMap[facetId];
        }
      }
    }

    // If per capita, explicitly include the denominator facets
    // that were tracked during data processing.
    const denom = statVar.value.denom;
    const denomFacets = chartStore.mapValuesDates.data?.denomFacets;

    if (statVar.value.perCapita && denom && denomFacets?.size > 0) {
      if (!statVarToFacets[denom]) {
        statVarToFacets[denom] = new Set();
      }

      const denomMetadataMap = chartStore.denomStat.data?.facets || {};

      for (const facetId of Array.from(denomFacets)) {
        statVarToFacets[denom].add(facetId);
        if (denomMetadataMap[facetId]) {
          facets[facetId] = denomMetadataMap[facetId];
        }
      }
    }

    return { facets, statVarToFacets };
  }, [
    chartStore.denomStat.data?.facets,
    chartStore.mapValuesDates.data?.denomFacets,
    chartStore.mapValuesDates.data?.numerFacets,
    facetList,
    statVar.value.dcid,
    statVar.value.denom,
    statVar.value.perCapita,
  ]);

  /**
   * Callback function for building observation specifications.
   * This is used by the API dialog to generate API calls (e.g., cURL
   * commands) for the user.
   *
   * @returns An array of `ObservationSpec` objects.
   */
  const getObservationSpecs = useCallback((): ObservationSpec[] => {
    if (
      !currentStatVarSpec ||
      !placeInfo.value.enclosingPlace.dcid ||
      !placeInfo.value.enclosedPlaceType
    ) {
      return [];
    }

    const entityExpression = `${placeInfo.value.enclosingPlace.dcid}<-containedInPlace+{typeOf:${placeInfo.value.enclosedPlaceType}}`;
    const date =
      getCappedStatVarDate(currentStatVarSpec.statVar, dateCtx.value) ||
      "LATEST";

    return buildObservationSpecs({
      statVarSpecs: [{ ...currentStatVarSpec, date }],
      statVarToFacets,
      entityExpression,
    });
  }, [
    currentStatVarSpec,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    dateCtx.value,
    statVarToFacets,
  ]);

  /**
   * Returns callback for fetching chart CSV data.
   * @returns A promise that resolves to chart CSV data.
   */
  const getDataCsv = useCallback(async (): Promise<string> => {
    if (
      !currentStatVarSpec ||
      !placeInfo.value.enclosingPlace.dcid ||
      !placeInfo.value.enclosedPlaceType
    ) {
      return "";
    }

    const dataCommonsClient = getDataCommonsClient();
    const date = getCappedStatVarDate(
      currentStatVarSpec.statVar,
      dateCtx.value
    );

    const rows = await dataCommonsClient.getDataRows({
      childType: placeInfo.value.enclosedPlaceType,
      date,
      parentEntity: placeInfo.value.enclosingPlace.dcid,
      variables: [],
      statVarSpecs: [currentStatVarSpec],
    });

    return dataRowsToCsv(rows, CSV_FIELD_DELIMITER, transformCsvHeader);
  }, [
    currentStatVarSpec,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    dateCtx.value,
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
      sources ? Array.from(sources) : [],
      WEBSITE_SURFACE
    );
  }, [getDataCsv, sources]);

  function renderContent(): ReactElement {
    if (!renderReady()) {
      return null;
    }
    if (
      chartStore.defaultStat.error ||
      _.isEmpty(chartStore.mapValuesDates.data.mapValues)
    ) {
      removeSpinner(CHART_LOADER_SCREEN);
      return (
        <div className="p-5">
          {`Sorry, the selected variable ${
            statVar.value.info.title || statVar.value.dcid
          } is not available for places in ${
            placeInfo.value.selectedPlace.name
          } of type ${
            ENCLOSED_PLACE_TYPE_NAMES[placeInfo.value.enclosedPlaceType] ||
            placeInfo.value.enclosedPlaceType
          }. Please try a different variable or different place options.`}
        </div>
      );
    }

    if (chartStore.geoJson.error) {
      removeSpinner(CHART_LOADER_SCREEN);
      return (
        <div className="p-5">
          {`Sorry, maps are not available for ` +
            `${placeInfo.value.enclosedPlaceType} ` +
            `in ${placeInfo.value.selectedPlace.name}. ` +
            `Try picking another place or type of place.`}
        </div>
      );
    }

    const date = getCappedStatVarDate(statVar.value.dcid, dateCtx.value);
    const rankingLink = getRankingLink(
      statVar.value,
      placeInfo.value.selectedPlace.dcid,
      placeInfo.value.enclosedPlaceType,
      date,
      chartStore.mapValuesDates.data.unit
    );

    const footer = document.getElementById("metadata").dataset.footer || "";

    const entities = Array.from(
      new Set([
        ...Object.keys(chartStore.mapValuesDates.data?.mapValues || {}),
        ...Object.keys(chartStore.mapPointValues.data || {}),
        ...Object.keys(chartStore.breadcrumbValues.data || {}),
      ])
    );

    return (
      <div className="chart-region" ref={containerRef}>
        <Chart
          geoJsonData={chartStore.geoJson.data}
          mapDataValues={chartStore.mapValuesDates.data.mapValues}
          metadata={metadata}
          breadcrumbDataValues={chartStore.breadcrumbValues.data}
          dates={chartStore.mapValuesDates.data.mapDates}
          sources={sources}
          unit={chartStore.mapValuesDates.data.unit}
          mapPointValues={chartStore.mapPointValues.data}
          mapPoints={chartStore.mapPointCoordinate.data}
          rankingLink={rankingLink}
          facetList={facetList}
          onFacetSelectorModalOpen={onFacetSelectorModalOpen}
          totalFacetCount={totalFacetCount}
          borderGeoJsonData={
            shouldShowBorder(placeInfo.value.enclosedPlaceType)
              ? chartStore.borderGeoJson.data
              : undefined
          }
          facetListLoading={facetListLoading}
          facetListError={facetListError}
          handleEmbed={handleEmbed}
          getObservationSpecs={getObservationSpecs}
          containerRef={containerRef}
          facets={facets}
          statVarToFacets={statVarToFacets}
          statVarSpecs={currentStatVarSpec ? [currentStatVarSpec] : []}
          entities={entities}
        >
          {display.value.showTimeSlider &&
            sampleDates &&
            sampleDates.length > 1 && (
              <TimeSlider
                currentDate={_.max(
                  Array.from(chartStore.mapValuesDates.data.mapDates)
                )}
                dates={sampleDates}
                metahash={statVar.value.metahash}
                startEnabled={
                  chartStore.mapValuesDates.data.mapDates.size === 1
                }
              />
            )}
        </Chart>

        {placeInfo.value.parentPlaces && (
          // Should separate out placeInfo into individual state.
          // The parentPlaces is only used for breadcumb section.
          <PlaceDetails
            breadcrumbDataValues={chartStore.breadcrumbValues.data}
            mapDataValues={chartStore.mapValuesDates.data.mapValues}
            metadata={metadata}
            unit={chartStore.mapValuesDates.data.unit}
            geoJsonFeatures={
              chartStore.geoJson.data ? chartStore.geoJson.data.features : []
            }
            europeanCountries={europeanCountries}
          />
        )}
        {footer && <div className="footer">* {footer}</div>}
        <ChartEmbed
          ref={embedModalElement}
          entities={entities}
          facets={facets}
          statVarSpecs={currentStatVarSpec ? [currentStatVarSpec] : []}
          statVarToFacets={statVarToFacets}
        />
      </div>
    );
  }

  return (
    <>
      {renderContent()}
      <div id={CHART_LOADER_SCREEN}>
        <div className="screen">
          <div id="spinner"></div>
        </div>
      </div>
    </>
  );
}
