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
import { chartStoreReducer, metadataReducer, sourcesReducer } from "./reducer";
import { TimeSlider } from "./time_slider";
import { BEST_AVAILABLE_METAHASH, getDate, getRankingLink } from "./util";

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
  useFetchMapPointStat(dispatchChartStore);
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
  const allSampleDates = useComputeSampleDates(chartStore);
  useComputeBreadcrumbValues(chartStore, dispatchChartStore);
  useComputeMapValueAndDate(
    chartStore,
    dispatchChartStore,
    dispatchSources,
    dispatchMetadata
  );
  const mapPointValues = useComputeMapPointValues(
    chartStore,
    dispatchSources,
    dispatchMetadata
  );
  const facetList = useComputeFacetList(chartStore);
  const legendDomain = useComputeLegendDomain(chartStore, allSampleDates);

  useEffect(() => {
    display.setDomain(legendDomain);
  }, [legendDomain]);

  // +++++++  BigQuery
  // TODO: add webdriver test for BigQuery button to ensure query works
  const getSqlQuery = useGetSqlQuery(chartStore);
  const bqLink = useRef(setUpBqButton(getSqlQuery));
  useEffect(() => {
    const dom = bqLink.current;
    dom.style.display = "none"; // Enable BQlink with "inline-block";
    return () => {
      dom.style.display = "none";
    };
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

  // Rendering logic below ...
  if (!statVar.value.info) {
    return null;
  }

  if (!placeInfo.value.enclosingPlace.dcid || !placeInfo.value.enclosingPlace) {
    return null;
  }

  if (!chartStore.mapValuesDates.data) {
    return null;
  }

  if (
    chartStore.defaultStat.error ||
    _.isEmpty(chartStore.mapValuesDates.data.mapValues)
  ) {
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
    return (
      <div className="p-5">
        {`Sorry, maps are not available for ${placeInfo.value.enclosedPlaceType} in ${placeInfo.value.selectedPlace.name}. Try picking another place or type of place.`}
      </div>
    );
  }

  if (!_.isEqual(chartStore.mapValuesDates.context.statVar, statVar.value)) {
    console.log("map value statVar do not match");
    return null;
  }

  if (
    !_.isEqual(chartStore.mapValuesDates.context.placeInfo, placeInfo.value)
  ) {
    console.log("map value placeInfo do not match");
    return null;
  }

  const date = getDate(statVar.value.dcid, dateCtx.value);

  let unit = "";
  for (const place in chartStore.defaultStat.data.data) {
    const obs = chartStore.defaultStat.data.data[place];
    unit = chartStore.defaultStat.data.facets[obs.facet].unit;
    break;
  }

  const rankingLink = getRankingLink(
    statVar.value,
    placeInfo.value.selectedPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    date,
    unit
  );

  let sampleDates: string[];
  if (allSampleDates) {
    if (statVar.value.metahash) {
      sampleDates = allSampleDates.facetDates[statVar.value.metahash];
    } else {
      // TODO: here should also set metahash to bestFacet to match the date
      // selection.
      sampleDates = allSampleDates.facetDates[allSampleDates.bestFacet];
    }
  }

  const metahash = statVar.value.metahash || BEST_AVAILABLE_METAHASH;

  return (
    <div className="chart-region">
      <Chart
        geoJsonData={chartStore.geoJson.data}
        mapDataValues={chartStore.mapValuesDates.data.mapValues}
        metadata={metadata}
        breadcrumbDataValues={chartStore.breadcrumbValues.data}
        dates={chartStore.mapValuesDates.data.mapDates}
        sources={sources}
        unit={unit}
        mapPointValues={mapPointValues}
        mapPoints={chartStore.mapPointCoordinate.data}
        europeanCountries={europeanCountries}
        rankingLink={rankingLink}
        facetList={facetList}
        geoRaster={chartStore.geoRaster.data}
        mapType={mapType}
        display={display}
        statVar={statVar}
        placeInfo={placeInfo.value}
      >
        {display.value.showTimeSlider &&
          sampleDates &&
          sampleDates.length > 1 && (
            <TimeSlider
              currentDate={_.max(
                Array.from(chartStore.mapValuesDates.data.mapDates)
              )}
              dates={sampleDates ? sampleDates : []}
              metahash={metahash}
              startEnabled={chartStore.mapValuesDates.data.mapDates.size === 1}
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
          unit={unit}
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
