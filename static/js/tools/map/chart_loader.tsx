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

import _ from "lodash";
import React, {
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { loadSpinner, removeSpinner } from "../../shared/util";
import { ENCLOSED_PLACE_TYPE_NAMES } from "../../utils/place_utils";
import { BqModal } from "../shared/bq_modal";
import { setUpBqButton } from "../shared/bq_utils";
import { Chart, MAP_TYPE } from "./chart";
import { emptyChartStore } from "./chart_store";
import { useComputeBreadcrumbValues } from "./compute/breadcrumb";
import { useComputeFacetList } from "./compute/facets";
import { useUpdateGeoJson } from "./compute/geojson";
import { useComputeLegendDomain } from "./compute/legend";
import { useComputeMapPointValues } from "./compute/map_point";
import { useComputeMapValueAndDate } from "./compute/map_value_dates";
import { useComputeSampleDates } from "./compute/sample_dates";
import { useGetSqlQuery } from "./compute/sql";
import { Context } from "./context";
import { useFetchAllDates } from "./fetcher/all_dates";
import { useFetchAllStat } from "./fetcher/all_stat";
import { useFetchBreadcrumbDenomStat } from "./fetcher/breadcrumb_denom_stat";
import { useFetchBreadcrumbStat } from "./fetcher/breadcrumb_stat";
import { useFetchDefaultStat } from "./fetcher/default_stat";
import { useFetchDenomStat } from "./fetcher/denom_stat";
import { useFetchEuropeanCountries } from "./fetcher/european_countries";
import { useFetchGeoJson } from "./fetcher/geojson";
import { useFetchGeoRaster } from "./fetcher/georaster";
import { useFetchMapPointCoordinate } from "./fetcher/map_point_coordinate";
import { useFetchMapPointStat } from "./fetcher/map_point_stat";
import { useFetchStatVarSummary } from "./fetcher/stat_var_summary";
import { PlaceDetails } from "./place_details";
import { useRenderReady } from "./ready_hooks";
import { chartStoreReducer, metadataReducer, sourcesReducer } from "./reducer";
import { TimeSlider } from "./time_slider";
import { CHART_LOADER_SCREEN, getDate, getRankingLink } from "./util";

export function ChartLoader(): JSX.Element {
  // +++++++  Context
  const { dateCtx, placeInfo, statVar, display } = useContext(Context);

  // +++++++  State
  const [mapType, setMapType] = useState(MAP_TYPE.D3);

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
  useFetchGeoRaster(dispatchChartStore);
  useFetchAllDates(dispatchChartStore);
  useFetchStatVarSummary(dispatchChartStore);

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
  const facetList = useComputeFacetList(chartStore);
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

  // +++++++  BigQuery
  // TODO: add webdriver test for BigQuery button to ensure query works
  const getSqlQuery = useGetSqlQuery(chartStore);
  const bqLink = useRef(setUpBqButton(getSqlQuery));
  useEffect(() => {
    const dom = bqLink.current;
    if (dom) {
      dom.style.display = "none"; // Enable BQlink with "inline-block";
      return () => {
        dom.style.display = "none";
      };
    }
  }, []);

  // Set map type to leaflet if georaster data is available before data needed
  // for d3 maps
  useEffect(() => {
    if (
      (_.isEmpty(chartStore.mapValuesDates.data) ||
        _.isEmpty(chartStore.geoJson.data)) &&
      !_.isEmpty(chartStore.geoRaster.data)
    ) {
      setMapType(MAP_TYPE.LEAFLET);
    }
  }, [
    chartStore.mapValuesDates.data,
    chartStore.geoJson.data,
    chartStore.geoRaster.data,
  ]);

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

  function renderContent(): JSX.Element {
    if (!renderReady(mapType)) {
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

    if (mapType === MAP_TYPE.D3 && chartStore.geoJson.error) {
      removeSpinner(CHART_LOADER_SCREEN);
      return (
        <div className="p-5">
          {`Sorry, maps are not available for ` +
            `${placeInfo.value.enclosedPlaceType}` +
            `in ${placeInfo.value.selectedPlace.name}. ` +
            `Try picking another place or type of place.`}
        </div>
      );
    }

    const date = getDate(statVar.value.dcid, dateCtx.value);
    const rankingLink = getRankingLink(
      statVar.value,
      placeInfo.value.selectedPlace.dcid,
      placeInfo.value.enclosedPlaceType,
      date,
      chartStore.mapValuesDates.data.unit
    );
    return (
      <div className="chart-region">
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
          europeanCountries={europeanCountries}
          rankingLink={rankingLink}
          facetList={facetList}
          geoRaster={chartStore.geoRaster.data}
          mapType={mapType}
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
        <BqModal getSqlQuery={getSqlQuery} showButton={true} />
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
