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

import _ from "lodash";
import React, { useEffect, useState } from "react";

import {
  ASYNC_ELEMENT_CLASS,
  ASYNC_ELEMENT_HOLDER_CLASS,
} from "../../constants/css_constants";
import { formatNumber, translateUnit } from "../../i18n/i18n";
import { Observation } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { getPoint, getSeries } from "../../utils/data_fetch_utils";
import { formatDate } from "../../utils/string_utils";
import {
  formatString,
  getDenomInfo,
  getSourcesJsx,
  getUnitAndScaling,
  ReplacementStrings,
} from "../../utils/tile_utils";

const NUM_FRACTION_DIGITS = 1;
// units that should be formatted as part of the number
const NUMBER_UNITS = ["%"];

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
  let numberUnit = "";
  let metadataUnit = translateUnit(
    props.statVarSpec.unit || highlightData.unitDisplayName
  );
  if (metadataUnit) {
    numberUnit = NUMBER_UNITS.find((unit) => metadataUnit.startsWith(unit));
    metadataUnit = numberUnit
      ? metadataUnit.slice(numberUnit.length).trimStart()
      : metadataUnit;
  }
  return (
    <div
      className={`chart-container highlight-tile ${ASYNC_ELEMENT_HOLDER_CLASS}`}
      {...{ part: "container" }}
    >
      {highlightData && (
        <>
          <span className="stat">
            <span className={`number ${ASYNC_ELEMENT_CLASS}`}>
              {formatNumber(
                highlightData.value,
                numberUnit,
                false,
                highlightData.numFractionDigits
              )}
            </span>
            {metadataUnit && <span className="metadata">{metadataUnit}</span>}
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
  const statPromise = getPoint(
    props.apiRoot,
    [props.place.dcid],
    [props.statVarSpec.statVar],
    props.date
  );
  const denomPromise = props.statVarSpec.denom
    ? getSeries(props.apiRoot, [props.place.dcid], [props.statVarSpec.denom])
    : Promise.resolve(null);
  return Promise.all([statPromise, denomPromise])
    .then(([statResp, denomResp]) => {
      const mainStatData =
        statResp.data[props.statVarSpec.statVar][props.place.dcid];
      let value = mainStatData.value;
      const facet = statResp.facets[mainStatData.facet];
      const sources = new Set();
      if (facet && facet.provenanceUrl) {
        sources.add(facet.provenanceUrl);
      }
      let { unit, scaling } = getUnitAndScaling(props.statVarSpec, statResp);
      if (props.statVarSpec.denom) {
        const denomInfo = getDenomInfo(
          props.statVarSpec,
          denomResp,
          props.place.dcid,
          mainStatData.date
        );
        if (!denomInfo) {
          return null;
        }
        value /= denomInfo.value;
        sources.add(denomInfo.source);
      }
      let numFractionDigits = NUM_FRACTION_DIGITS;
      if (unit in UnitOverrideConfig) {
        const override = UnitOverrideConfig[unit];
        unit = override.unitDisplayName;
        scaling = override.multiplier;
        numFractionDigits = override.numFractionDigits || numFractionDigits;
      }
      if (scaling) {
        value *= scaling;
      }
      const result = {
        value,
        date: mainStatData.date,
        numFractionDigits,
        unitDisplayName: unit,
        sources,
      };
      return result;
    })
    .catch(() => {
      return null;
    });
};
