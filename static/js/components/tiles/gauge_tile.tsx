/**
 * Copyright 2023 Google LLC
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
 * Component for rendering a gauge tile.
 */

import axios from "axios";
import _ from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { DataGroup, DataPoint } from "../../chart/base";
import { drawGroupBarChart } from "../../chart/draw";
import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import { DATA_CSS_CLASS } from "../../constants/tile_constants";
import { formatNumber } from "../../i18n/i18n";
import { Observation, PointApiResponse } from "../../shared/stat_types";
import { PointApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { RankingPoint } from "../../types/ranking_unit_types";
import { BarTileSpec } from "../../types/subject_page_proto_types";
import { stringifyFn } from "../../utils/axios";
import { dataGroupsToCsv } from "../../utils/chart_csv_utils";
import { getPlaceNames } from "../../utils/place_utils";
import { getUnit } from "../../utils/stat_metadata_utils";
import { getDateRange } from "../../utils/string_utils";
import {
  formatString,
  getStatVarName,
  ReplacementStrings,
} from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

const NUM_FRACTION_DIGITS = 1;

export interface GaugeTilePropType {
  // Text to accompany gauge
  description: string;
  // Place to show data for
  place: NamedTypedPlace;
  // Variable to show data for
  statVarSpec: StatVarSpec;
  // API root
  apiRoot?: string;
}

export function GaugeTile(props: GaugeTilePropType): JSX.Element {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [gaugeData, setGaugeData] = useState<Observation | undefined>(null);

  useEffect(() => {
    if (!gaugeData) {
      (async () => {
        const data = await fetchData(props);
        setGaugeData(data);
      })();
    }
  }, [props, gaugeData]);

  const drawFn = useCallback(() => {
    if (_.isEmpty(gaugeData)) {
      return;
    }
    draw(props, gaugeData, chartContainerRef.current);
  }, [props, gaugeData]);

  useDrawOnResize(drawFn, chartContainerRef.current);

  return (
    <div
      className={`chart-container highlight-tile ${ASYNC_ELEMENT_HOLDER_CLASS}`}
      ref={chartContainerRef}
    >
      {gaugeData && (
        <span className="stat">
          {formatNumber(
            gaugeData.value,
            props.statVarSpec.unit,
            false,
            NUM_FRACTION_DIGITS
          )}
        </span>
      )}
      <span className="desc">{props.description}</span>
    </div>
  );
}

export const fetchData = async (props: GaugeTilePropType) => {
  // Now assume highlight only talks about one stat var.
  const mainStatVar = props.statVarSpec.statVar;
  const denomStatVar = props.statVarSpec.denom;
  const statVars = [mainStatVar];
  if (denomStatVar) {
    statVars.push(denomStatVar);
  }
  try {
    const resp = await axios.get<PointApiResponse>(
      `${props.apiRoot || ""}/api/observations/point`,
      {
        params: {
          entities: [props.place.dcid],
          variables: statVars,
        },
        paramsSerializer: stringifyFn,
      }
    );

    const statData = resp.data.data;
    const mainStatData = statData[mainStatVar][props.place.dcid];
    let value = mainStatData.value;
    if (denomStatVar) {
      value /= statData[denomStatVar][props.place.dcid].value;
    }
    if (props.statVarSpec.scaling) {
      value *= props.statVarSpec.scaling;
    }
    return { value, date: mainStatData.date };
  } catch (error) {
    console.log(error);
    return null;
  }
};

function draw(
  props: gaugePropType,
  chartData: gaugeData,
  svgContainer: HTMLDivElement,
  svgWidth?: number
): void {
  return;
}
