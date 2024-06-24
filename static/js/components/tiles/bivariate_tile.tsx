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
 * Component for rendering a bivariate type tile.
 */

import { DataCommonsClient } from "@datacommonsorg/client";
import axios from "axios";
import _ from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOMServer from "react-dom/server";

import { VisType } from "../../apps/visualization/vis_type_configs";
import { BivariateProperties, drawBivariate } from "../../chart/draw_bivariate";
import { Point } from "../../chart/draw_scatter";
import { GeoJsonData } from "../../chart/types";
import { URL_PATH } from "../../constants/app/visualization_constants";
import { CSV_FIELD_DELIMITER } from "../../constants/tile_constants";
import { USA_PLACE_DCID } from "../../shared/constants";
import { useLazyLoad } from "../../shared/hooks";
import { PointApiResponse, SeriesApiResponse } from "../../shared/stat_types";
import { NamedPlace, NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { getStatWithinPlace } from "../../tools/scatter/util";
import {
  isChildPlaceOf,
  shouldShowMapBoundaries,
} from "../../tools/shared_util";
import {
  getContextStatVar,
  getHash,
} from "../../utils/app/visualization_utils";
import { getSeriesWithin } from "../../utils/data_fetch_utils";
import { getStringOrNA } from "../../utils/number_utils";
import { getPlaceScatterData } from "../../utils/scatter_data_utils";
import {
  getDenomInfo,
  getFirstCappedStatVarSpecDate,
  getNoDataErrorMsg,
  getStatFormat,
  getStatVarName,
  ReplacementStrings,
  showError,
  transformCsvHeader,
} from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

interface BivariateTilePropType {
  id: string;
  title: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  statVarSpec: StatVarSpec[];
  svgChartHeight: number;
  // Extra classes to add to the container.
  className?: string;
  // Whether or not to show the explore more button.
  showExploreMore?: boolean;
  // API root
  apiRoot?: string;
  // Optional: only load this component when it's near the viewport
  lazyLoad?: boolean;
  /**
   * Optional: If lazy loading is enabled, load the component when it is within
   * this margin of the viewport. Default: "0px"
   */
  lazyLoadMargin?: string;
}

interface RawData {
  geoJson: GeoJsonData;
  placeStats: PointApiResponse;
  population: SeriesApiResponse;
  placeNames: { [placeDcid: string]: string };
  parentPlaces: NamedTypedPlace[];
}

interface BivariateChartData {
  xStatVar: StatVarSpec;
  yStatVar: StatVarSpec;
  points: { [placeDcid: string]: Point };
  geoJson: GeoJsonData;
  sources: Set<string>;
  isUsaPlace: boolean;
  showMapBoundaries: boolean;
  props: BivariateTilePropType;
  errorMsg: string;
}

export function BivariateTile(props: BivariateTilePropType): JSX.Element {
  const svgContainer = useRef(null);
  const legend = useRef(null);
  const [bivariateChartData, setBivariateChartData] = useState<
    BivariateChartData | undefined
  >(null);
  const { shouldLoad, containerRef } = useLazyLoad(props.lazyLoadMargin);
  useEffect(() => {
    if (props.lazyLoad && !shouldLoad) {
      return;
    }
    if (!bivariateChartData || !_.isEqual(bivariateChartData.props, props)) {
      (async () => {
        const data = await fetchData(props);
        setBivariateChartData(data);
      })();
    }
  }, [props, bivariateChartData, shouldLoad]);

  const drawFn = useCallback(() => {
    if (_.isEmpty(bivariateChartData)) {
      return;
    }
    draw(bivariateChartData, props, svgContainer, legend);
  }, [props, bivariateChartData]);

  useDrawOnResize(drawFn, svgContainer.current);

  const rs: ReplacementStrings = {
    placeName: props.place.dcid,
  };
  return (
    <ChartTileContainer
      id={props.id}
      title={props.title}
      apiRoot={props.apiRoot}
      sources={bivariateChartData && bivariateChartData.sources}
      replacementStrings={rs}
      className={`${props.className} bivariate-chart`}
      allowEmbed={true}
      getDataCsv={getDataCsvCallback(props)}
      isInitialLoading={_.isNull(bivariateChartData)}
      exploreLink={props.showExploreMore ? getExploreLink(props) : null}
      hasErrorMsg={bivariateChartData && !!bivariateChartData.errorMsg}
      statVarSpecs={props.statVarSpec}
      forwardRef={containerRef}
    >
      <div
        id={props.id}
        className="bivariate-svg-container"
        ref={svgContainer}
        style={{ minHeight: props.svgChartHeight }}
      />
      <div id="bivariate-legend-container" ref={legend} />
    </ChartTileContainer>
  );
}

/**
 * Returns callback for fetching chart CSV data
 * @param props Chart properties
 * @returns Async function for fetching chart CSV
 */
function getDataCsvCallback(
  props: BivariateTilePropType
): () => Promise<string> {
  return () => {
    const dataCommonsClient = new DataCommonsClient({ apiRoot: props.apiRoot });
    // Assume all variables will have the same date
    // TODO: Update getCsv to handle different dates for different variables
    const date = getFirstCappedStatVarSpecDate(props.statVarSpec);
    const perCapitaVariables = props.statVarSpec
      .filter((v) => v.denom)
      .map((v) => v.statVar);
    return dataCommonsClient.getCsv({
      childType: props.enclosedPlaceType,
      date,
      fieldDelimiter: CSV_FIELD_DELIMITER,
      parentEntity: props.place.dcid,
      perCapitaVariables,
      transformHeader: transformCsvHeader,
      variables: props.statVarSpec.map((v) => v.statVar),
    });
  };
}

function getPopulationPromise(
  placeDcid: string,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[]
): Promise<SeriesApiResponse> {
  const variables = [];
  for (const sv of statVarSpec) {
    if (sv.denom) {
      variables.push(sv.denom);
    }
  }
  if (_.isEmpty(variables)) {
    return Promise.resolve(null);
  } else {
    return getSeriesWithin("", placeDcid, enclosedPlaceType, variables);
  }
}

export const fetchData = async (props: BivariateTilePropType) => {
  if (props.statVarSpec.length < 2) {
    // TODO: add error message
    return;
  }
  const geoJsonPromise: Promise<GeoJsonData> = axios
    .get(
      `/api/choropleth/geojson?placeDcid=${props.place.dcid}&placeType=${props.enclosedPlaceType}`
    )
    .then((resp) => resp.data);
  const placeStatsPromise: Promise<PointApiResponse> = getStatWithinPlace(
    props.place.dcid,
    props.enclosedPlaceType,
    [
      { statVarDcid: props.statVarSpec[0].statVar },
      { statVarDcid: props.statVarSpec[1].statVar },
    ]
  );
  const populationPromise: Promise<SeriesApiResponse> = getPopulationPromise(
    props.place.dcid,
    props.enclosedPlaceType,
    props.statVarSpec
  );
  const placeNamesPromise = axios
    .get(
      `/api/place/descendent/name?dcid=${props.place.dcid}&descendentType=${props.enclosedPlaceType}`
    )
    .then((resp) => resp.data);
  const parentPlacesPromise = axios
    .get(`/api/place/parent?dcid=${props.place.dcid}`)
    .then((resp) => resp.data);
  try {
    const [placeStats, population, placeNames, geoJson, parentPlaces] =
      await Promise.all([
        placeStatsPromise,
        populationPromise,
        placeNamesPromise,
        geoJsonPromise,
        parentPlacesPromise,
      ]);
    const rawData = {
      placeStats,
      population,
      placeNames,
      geoJson,
      parentPlaces,
    };
    return rawToChart(
      props,
      rawData,
      props.statVarSpec,
      props.place,
      props.enclosedPlaceType
    );
  } catch (error) {
    return null;
  }
};

function rawToChart(
  props: BivariateTilePropType,
  rawData: RawData,
  statVarSpec: StatVarSpec[],
  place: NamedTypedPlace,
  enclosedPlaceType: string
): BivariateChartData {
  const xStatVar = statVarSpec[0];
  const yStatVar = statVarSpec[1];
  const xPlacePointStat = rawData.placeStats.data[xStatVar.statVar];
  const yPlacePointStat = rawData.placeStats.data[yStatVar.statVar];
  if (!xPlacePointStat || !yPlacePointStat) {
    return;
  }
  const points = {};
  const sources: Set<string> = new Set();
  const xUnitScaling = getStatFormat(xStatVar, rawData.placeStats);
  const yUnitScaling = getStatFormat(yStatVar, rawData.placeStats);
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
      rawData.population,
      rawData.placeStats.facets
    );
    if (!placeChartData) {
      console.log(`BIVARIATE: No data for ${place}, skipping`);
      continue;
    }
    placeChartData.sources.forEach((source) => {
      if (!_.isEmpty(source)) {
        sources.add(source);
      }
    });
    const point = placeChartData.point;
    if (xStatVar.denom) {
      const denomInfo = getDenomInfo(
        xStatVar,
        rawData.population,
        place,
        point.xDate
      );
      if (!denomInfo) {
        // skip this data point because missing denom data.
        continue;
      }
      point.xVal /= denomInfo.value;
      point.xPopDate = denomInfo.date;
      point.xPopVal = denomInfo.value;
      sources.add(denomInfo.source);
    }
    if (xUnitScaling.scaling) {
      point.xVal *= xUnitScaling.scaling;
    }
    if (yStatVar.denom) {
      const denomInfo = getDenomInfo(
        yStatVar,
        rawData.population,
        place,
        point.yDate
      );
      if (!denomInfo) {
        // skip this data point because missing denom data.
        continue;
      }
      point.yVal /= denomInfo.value;
      point.yPopDate = denomInfo.date;
      point.yPopVal = denomInfo.value;
      sources.add(denomInfo.source);
    }
    if (yUnitScaling.scaling) {
      point.yVal *= yUnitScaling.scaling;
    }
    points[place] = point;
  }
  const errorMsg = _.isEmpty(points)
    ? getNoDataErrorMsg(props.statVarSpec)
    : "";
  return {
    xStatVar,
    yStatVar,
    points,
    sources,
    geoJson: rawData.geoJson,
    isUsaPlace: isChildPlaceOf(
      place.dcid,
      USA_PLACE_DCID,
      rawData.parentPlaces
    ),
    showMapBoundaries: shouldShowMapBoundaries(place, enclosedPlaceType),
    props,
    errorMsg,
  };
}

const getTooltipHtml =
  (points: { [placeDcid: string]: Point }, xLabel: string, yLabel: string) =>
  (place: NamedPlace) => {
    const point = points[place.dcid];
    if (_.isEmpty(point)) {
      return (
        `<header><b>${place.name || place.dcid}</b></header>` +
        "Data Unavailable"
      );
    }
    const element = (
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
    return ReactDOMServer.renderToStaticMarkup(element);
  };

function draw(
  chartData: BivariateChartData,
  props: BivariateTilePropType,
  svgContainer: React.RefObject<HTMLDivElement>,
  legend: React.RefObject<HTMLDivElement>
): void {
  if (chartData.errorMsg) {
    showError(chartData.errorMsg, svgContainer.current);
    return;
  }
  const width = svgContainer.current.offsetWidth;
  const yLabel = getStatVarName(
    chartData.yStatVar.statVar,
    [chartData.yStatVar],
    !_.isEmpty(chartData.yStatVar.denom)
  );
  const xLabel = getStatVarName(
    chartData.xStatVar.statVar,
    [chartData.xStatVar],
    !_.isEmpty(chartData.xStatVar.denom)
  );
  const properties: BivariateProperties = {
    width,
    height: props.svgChartHeight,
    xLabel,
    yLabel,
    xUnit: chartData.xStatVar.unit,
    yUnit: chartData.yStatVar.unit,
    xLog: chartData.xStatVar.log,
    yLog: chartData.yStatVar.log,
    isUsaPlace: chartData.isUsaPlace,
    showMapBoundaries: chartData.showMapBoundaries,
    placeDcid: props.place.dcid,
  };

  drawBivariate(
    svgContainer,
    legend,
    chartData.points,
    chartData.geoJson,
    properties,
    _.noop,
    getTooltipHtml(chartData.points, xLabel, yLabel)
  );
}

function getExploreLink(props: BivariateTilePropType): {
  displayText: string;
  url: string;
} {
  const hash = getHash(
    VisType.SCATTER,
    [props.place.dcid],
    props.enclosedPlaceType,
    props.statVarSpec.slice(0, 2).map((svSpec) => getContextStatVar(svSpec)),
    {}
  );
  return {
    displayText: "Scatter Tool",
    url: `${props.apiRoot || ""}${URL_PATH}#${hash}`,
  };
}
