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
import { FacetStore, StatMetadata } from "../../shared/stat_types";
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
  const { facetList, facetListLoading, facetListError } =
    useComputeFacetList(chartStore);
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
   * Convert facet metadata and mappings (derived from the chart store) into a format
   * to be used for citation display in the embed modal.
   */
  const { facets, statVarToFacets } = useMemo(() => {
    const facets: Record<string, StatMetadata> = {};
    const statVarToFacets: StatVarFacetMap = {};

    const mergeFacets = (
      facetStore: FacetStore,
      statVarDcid?: string
    ): void => {
      if (!facetStore) return;
      for (const facetId in facetStore) {
        facets[facetId] = facetStore[facetId];
        if (statVarDcid) {
          if (!statVarToFacets[statVarDcid]) {
            statVarToFacets[statVarDcid] = new Set();
          }
          statVarToFacets[statVarDcid].add(facetId);
        }
      }
    };

    if (chartStore.defaultStat.data?.facets) {
      mergeFacets(chartStore.defaultStat.data.facets, statVar.value.dcid);
    }
    if (chartStore.denomStat.data?.facets && statVar.value.denom) {
      mergeFacets(chartStore.denomStat.data.facets, statVar.value.denom);
    }
    return { facets, statVarToFacets };
  }, [chartStore.defaultStat.data, chartStore.denomStat.data, statVar.value]);

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
