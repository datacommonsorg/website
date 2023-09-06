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

import _ from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { VisType } from "../../apps/visualization/vis_type_configs";
import { DataGroup, DataPoint, expandDataPoints } from "../../chart/base";
import { drawLineChart } from "../../chart/draw_line";
import { URL_PATH } from "../../constants/app/visualization_constants";
import { SeriesApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { loadSpinner, removeSpinner } from "../../shared/util";
import { computeRatio } from "../../tools/shared_util";
import {
  getContextStatVar,
  getHash,
} from "../../utils/app/visualization_utils";
import { dataGroupsToCsv } from "../../utils/chart_csv_utils";
import {
  getBestUnit,
  getSeries,
  getSeriesWithin,
} from "../../utils/data_fetch_utils";
import { getPlaceNames } from "../../utils/place_utils";
import { getUnit } from "../../utils/stat_metadata_utils";
import {
  getNoDataErrorMsg,
  getStatVarNames,
  getUnitAndScaling,
  ReplacementStrings,
  showError,
} from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

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
  // Whether or not to show a loading spinner when fetching data.
  showLoadingSpinner?: boolean;
  // Whether to show tooltip on hover
  showTooltipOnHover?: boolean;
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

  useEffect(() => {
    if (!chartData || !_.isEqual(chartData.props, props)) {
      loadSpinner(props.id);
      (async () => {
        const data = await fetchData(props);
        if (props && _.isEqual(data.props, props)) {
          setChartData(data);
        }
      })();
    }
  }, [props, chartData]);

  const drawFn = useCallback(() => {
    if (_.isEmpty(chartData)) {
      return;
    }
    draw(props, chartData, svgContainer.current);
    removeSpinner(props.id);
  }, [props, chartData]);

  useDrawOnResize(drawFn, svgContainer.current);
  return (
    <ChartTileContainer
      id={props.id}
      title={props.title}
      sources={chartData && chartData.sources}
      replacementStrings={getReplacementStrings(props)}
      className={`${props.className} line-chart`}
      allowEmbed={true}
      getDataCsv={chartData ? () => dataGroupsToCsv(chartData.dataGroup) : null}
      isInitialLoading={_.isNull(chartData)}
      exploreLink={props.showExploreMore ? getExploreLink(props) : null}
      hasErrorMsg={chartData && !!chartData.errorMsg}
    >
      <div
        id={props.id}
        className="svg-container"
        ref={svgContainer}
        style={{ minHeight: props.svgChartHeight }}
      >
        {props.showLoadingSpinner && (
          <div className="screen">
            <div id="spinner"></div>
          </div>
        )}
      </div>
    </ChartTileContainer>
  );
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
  const statVars = [];
  for (const spec of props.statVarSpec) {
    statVars.push(spec.statVar);
    if (spec.denom) {
      statVars.push(spec.denom);
    }
  }

  let dataPromise: Promise<SeriesApiResponse>;
  if (!_.isEmpty(props.comparisonPlaces)) {
    dataPromise = getSeries(props.apiRoot, props.comparisonPlaces, statVars);
  } else if (props.enclosedPlaceType) {
    dataPromise = getSeriesWithin(
      props.apiRoot,
      props.place.dcid,
      props.enclosedPlaceType,
      statVars
    );
  } else {
    dataPromise = getSeries(props.apiRoot, [props.place.dcid], statVars);
  }

  const resp = await dataPromise;
  // get place names from dcids
  const placeDcids = Object.keys(resp.data[statVars[0]]);
  const statVarNames = await getStatVarNames(props.statVarSpec, props.apiRoot);
  const placeNames = await getPlaceNames(placeDcids, props.apiRoot);
  // How legend labels should be set
  // If neither options are set, default to showing stat vars in legend labels
  const options = {
    // If many places and one stat var, legend should show only place labels
    usePlaceLabels: statVars.length == 1 && placeDcids.length > 1,
    // If many places and many stat vars, legends need to show both
    useBothLabels: statVars.length > 1 && placeDcids.length > 1,
  };
  return rawToChart(resp, props, placeNames, statVarNames, options);
};

export function draw(
  props: LineTilePropType,
  chartData: LineChartData,
  svgContainer: HTMLDivElement
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
    false,
    props.showTooltipOnHover,
    {
      colors: props.colors,
      unit: chartData.unit,
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
  const { unit, scaling } = getUnitAndScaling(props.statVarSpec[0], null, raw);
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
    props.comparisonPlaces || [props.place.dcid],
    "",
    props.statVarSpec.map((spec) => getContextStatVar(spec)),
    {}
  );
  return {
    displayText: "Timeline Tool",
    url: `${props.apiRoot || ""}${URL_PATH}#${hash}`,
  };
}
