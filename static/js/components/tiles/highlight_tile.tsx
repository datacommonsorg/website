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
 * Component for rendering a highlight tile.
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useState } from "react";

import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import { formatNumber, translateUnit } from "../../i18n/i18n";
import { Observation, PointApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { stringifyFn } from "../../utils/axios";
import { formatDate } from "../../utils/string_utils";
import {
  ReplacementStrings,
  formatString,
  getSourcesJsx,
} from "../../utils/tile_utils";

const NUM_FRACTION_DIGITS = 1;
const NO_SPACE_UNITS = ["%"];

/**
 * Override unit display when unit contains
 * "TH" (Thousands), "M" (Millions), "B" (Billions)
 */
interface UnitOverride {
  multiplier: number;
  numFractionDigits?: number;
  unit: string;
  unitDisplayName: string;
}
const UnitOverrideConfig: {
  [key: string]: UnitOverride;
} = {
  SDG_CON_USD_M: {
    unit: "SDG_CON_USD",
    multiplier: 1000000,
    unitDisplayName: "Constant USD",
  },
  SDG_CUR_LCU_M: {
    unit: "SDG_CUR_LCU",
    multiplier: 1000000,
    unitDisplayName: "Current local currency",
  },
  SDG_CU_USD_B: {
    unit: "SDG_CU_USD",
    multiplier: 1000000000,
    unitDisplayName: "USD",
  },
  SDG_CU_USD_M: {
    unit: "SDG_CU_USD",
    multiplier: 1000000,
    unitDisplayName: "USD",
  },
  SDG_HA_TH: {
    unit: "SDG_HA",
    multiplier: 1000,
    unitDisplayName: "Hectares",
  },
  SDG_NUM_M: {
    unit: "SDG_NUMBER",
    multiplier: 1000000,
    unitDisplayName: "",
  },
  SDG_NUM_TH: {
    unit: "SDG_NUMBER",
    multiplier: 1000,
    unitDisplayName: "",
  },
  SDG_TONNES_M: {
    unit: "SDG_TONNES",
    multiplier: 1000000,
    unitDisplayName: "Tonnes",
  },
  SDG_NUMBER: {
    unit: "SDG_NUMBER",
    multiplier: 1,
    numFractionDigits: 0,
    unitDisplayName: "",
  },
};

export interface HighlightTilePropType {
  // API root for data fetch
  apiRoot?: string;
  // Date to fetch data for
  date?: string;
  // Text to accompany the stat var value highlighted
  description: string;
  // Place to get data for
  place: NamedTypedPlace;
  // Variable to get data for
  statVarSpec: StatVarSpec;
}

interface HighlightData extends Observation {
  sources: Set<string>;
  numFractionDigits?: number;
}

export function HighlightTile(props: HighlightTilePropType): JSX.Element {
  const [highlightData, setHighlightData] = useState<HighlightData | undefined>(
    null
  );

  useEffect(() => {
    fetchData(props).then((data) => {
      setHighlightData(data);
    });
  }, [props]);

  if (!highlightData) {
    return null;
  }
  const rs: ReplacementStrings = {
    placeName: props.place.name,
    date: formatDate(highlightData.date),
  };
  let description = "";
  if (props.description) {
    description = formatString(props.description + " (${date})", rs);
  }
  // TODO: The {...{ part: "container"}} syntax to set a part is a hacky
  // workaround to add a "part" attribute to a React element without npm errors.
  // This hack should be cleaned up.
  const unitString = translateUnit(
    props.statVarSpec.unit || highlightData.unitDisplayName
  );
  const hasUnitSpace =
    !!unitString &&
    NO_SPACE_UNITS.filter((unit) => unitString.startsWith(unit)).length === 0;
  return (
    <div
      className={`chart-container highlight-tile ${ASYNC_ELEMENT_HOLDER_CLASS}`}
      {...{ part: "container" }}
    >
      {highlightData && (
        <>
          <span className="stat">
            <span>
              {formatNumber(
                highlightData.value,
                "",
                false,
                highlightData.numFractionDigits
              )}
            </span>
            {unitString && (
              <span className="metadata">
                {`${hasUnitSpace ? " " : ""}${unitString}`}
              </span>
            )}
          </span>
        </>
      )}
      <span className="desc">{description}</span>
      {!_.isEmpty(highlightData.sources) &&
        getSourcesJsx(highlightData.sources)}
    </div>
  );
}

const fetchData = (props: HighlightTilePropType): Promise<HighlightData> => {
  // Now assume highlight only talks about one stat var.
  const mainStatVar = props.statVarSpec.statVar;
  const denomStatVar = props.statVarSpec.denom;
  const statVars = [mainStatVar];
  if (denomStatVar) {
    statVars.push(denomStatVar);
  }
  return axios
    .get<PointApiResponse>(`${props.apiRoot || ""}/api/observations/point`, {
      params: {
        date: props.date,
        entities: [props.place.dcid],
        variables: statVars,
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      console.log("resp.data=", resp.data);
      const statData = resp.data.data;
      const mainStatData = statData[mainStatVar][props.place.dcid];
      let value = mainStatData.value;
      const facet = resp.data.facets[mainStatData.facet];
      if (denomStatVar) {
        value /= statData[denomStatVar][props.place.dcid].value;
      }
      if (props.statVarSpec.scaling) {
        value *= props.statVarSpec.scaling;
      }
      const result = {
        value,
        date: mainStatData.date,
        numFractionDigits: NUM_FRACTION_DIGITS,
      };
      if (facet) {
        if (facet.unit in UnitOverrideConfig) {
          const override = UnitOverrideConfig[facet.unit];
          result["unitDisplayName"] = override.unitDisplayName;
          result.value = result.value * override.multiplier;
          result["numFractionDigits"] =
            override.numFractionDigits === undefined
              ? NUM_FRACTION_DIGITS
              : override.numFractionDigits;
        } else if (facet.unitDisplayName) {
          result["unitDisplayName"] = facet.unitDisplayName;
        }
        if (facet.provenanceUrl) {
          result["sources"] = new Set([facet.provenanceUrl]);
        }
      }
      return result;
    })
    .catch(() => {
      return null;
    });
};
