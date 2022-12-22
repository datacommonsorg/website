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
 * Component for rendering a histogram type tile.
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import { DataPoint, expandDataPoints } from "../../chart/base";
import { drawHistogram, drawHistogramOverTime } from "../../chart/draw";
import { CHART_HEIGHT } from "../../constants/tile_constants";
import { SeriesApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { computeRatio } from "../../tools/shared_util";
import { stringifyFn } from "../../utils/axios";
import { ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";

interface HistogramTilePropType {
  id: string;
  title: string;
  place: NamedTypedPlace;
  statVarSpec: StatVarSpec[];
}

interface HistogramData {
  dataPoints: DataPoint[];
  sources: Set<string>;
}

/**
 * Main histogram tile component
 */
export function HistogramTile(props: HistogramTilePropType): JSX.Element {
  const svgContainer = useRef(null);
  const [rawData, setRawData] = useState<SeriesApiResponse | undefined>(null);
  const [histogramData, setHistogramData] = useState<HistogramData | undefined>(
    null
  );

  useEffect(() => {
    fetchData(props, setRawData);
  }, [props]);

  useEffect(() => {
    if (rawData) {
      processData(props, rawData, setHistogramData);
    }
  }, [props, rawData]);

  useEffect(() => {
    if (histogramData) {
      draw(props, histogramData.dataPoints);
    }
  }, [props, histogramData]);

  if (!histogramData) {
    return null;
  }
  const rs: ReplacementStrings = {
    place: props.place.name,
    date: "",
  };
  return (
    <ChartTileContainer
      title={props.title}
      sources={histogramData.sources}
      replacementStrings={rs}
      className="histogram-chart"
    >
      <div id={props.id} className="svg-container" ref={svgContainer}></div>
    </ChartTileContainer>
  );
}

/**
 * Gets the series of observations to plot
 */
function fetchData(
  props: HistogramTilePropType,
  setRawData: (data: SeriesApiResponse) => void
): void {
  const statVars = [];
  for (const spec of props.statVarSpec) {
    statVars.push(spec.statVar);
    if (spec.denom) {
      statVars.push(spec.denom);
    }
  }
  axios
    .get("/api/observations/series", {
      // Fetch both numerator stat vars and denominator stat vars
      params: {
        variables: statVars,
        entities: [props.place.dcid],
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      setRawData(resp.data);
    })
    .catch((error) => {
      console.log(error);
      setRawData(null);
    });
}

/**
 * Convert
 */
function processData(
  props: HistogramTilePropType,
  rawData: SeriesApiResponse,
  setHistogramData: (data: HistogramData) => void
): void {
  const histogramData = rawToChart(rawData, props);
  setHistogramData(histogramData);
}

/**
 * Renders the histogram
 */
function draw(props: HistogramTilePropType, histogramData: DataPoint[]): void {
  const elem = document.getElementById(props.id);
  // TODO: Remove all cases of setting innerHTML directly.
  elem.innerHTML = "";
  drawHistogram(
    props.id,
    elem.offsetWidth,
    CHART_HEIGHT,
    histogramData,
    props.statVarSpec[0].unit
  );
}

/**
 * Performs conversion of raw series data to HistogramData object
 */
function rawToChart(
  rawData: SeriesApiResponse,
  props: HistogramTilePropType
): HistogramData {
  // (TODO): We assume the index of numerator and denominator matches.
  // This is brittle and should be updated in the protobuf that binds both
  // together.
  const raw = _.cloneDeep(rawData);
  const dataPoints: DataPoint[] = [];
  const sources = new Set<string>();
  const allDates = new Set<string>();
  for (const spec of props.statVarSpec) {
    // Do not modify the React state. Create a clone.
    const series = raw.data[spec.statVar][props.place.dcid];
    let obsList = series.series;
    if (spec.denom) {
      const denomSeries = raw.data[spec.denom][props.place.dcid];
      obsList = computeRatio(obsList, denomSeries.series);
    }
    if (obsList.length > 0) {
      for (const obs of obsList) {
        dataPoints.push({
          label: obs.date,
          time: new Date(obs.date).getTime(),
          value: spec.scaling ? obs.value * spec.scaling : obs.value,
        });
        allDates.add(obs.date);
      }
      sources.add(raw.facets[series.facet].provenanceUrl);
    }
  }
  return {
    dataPoints: dataPoints,
    sources: sources,
  };
}
