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
 * Util functions used by the visualization tools.
 */

import _ from "lodash";

import { VisType } from "../../apps/visualization/vis_type_configs";
import {
  DISPLAY_PARAM_KEYS,
  PARAM_VALUE_SEP,
  PARAM_VALUE_TRUE,
  STAT_VAR_PARAM_KEYS,
  URL_PARAMS,
} from "../../constants/app/visualization_constants";
import { StatVarSpec } from "../../shared/types";

const DEFAULT_DENOM = "Count_Person";

export interface ContextStatVar {
  dcid: string;
  info?: { title?: string };
  isPerCapita?: boolean;
  isLog?: boolean;
  denom?: string;
  date?: string;
  facetId?: string;
}

export interface DisplayOptions {
  scatterPlaceLabels?: boolean;
  scatterQuadrants?: boolean;
}
/**
 * Gets the stat var spec for a context stat var.
 * @param sv context stat var to get the stat var spec for
 * @param visType vis type to get the stat var spec for
 */
export function getStatVarSpec(
  sv: ContextStatVar,
  visType: string
): StatVarSpec {
  // If timeline, don't allow using specified denoms.
  // TODO: allow using specified denoms for timeline. Need to handle how we
  // group the charts.
  const denom =
    visType === VisType.TIMELINE ? DEFAULT_DENOM : sv.denom || DEFAULT_DENOM;
  return {
    denom: sv.isPerCapita ? denom : "",
    log: visType === VisType.SCATTER && sv.isLog,
    name: sv.info.title || sv.dcid,
    scaling: 1,
    statVar: sv.dcid,
    unit: "",
    date: visType !== VisType.TIMELINE ? sv.date : "",
    facetId: sv.facetId || "",
  };
}

export function getContextStatVar(svSpec: StatVarSpec): ContextStatVar {
  return {
    dcid: svSpec.statVar,
    info: null,
    isPerCapita: !!svSpec.denom,
    isLog: svSpec.log,
    denom: svSpec.denom,
    date: svSpec.date,
  };
}

/**
 * Get visualization tool url hash
 * @param visType type of visualization
 * @param places list of places
 * @param enclosedPlaceType enclosed place type
 * @param statVars list of context stat vars
 * @param displayOptions display options
 */
export function getHash(
  visType: string,
  places: string[],
  enclosedPlaceType: string,
  statVars: ContextStatVar[],
  displayOptions: DisplayOptions
): string {
  const params = {
    [URL_PARAMS.VIS_TYPE]: visType,
    [URL_PARAMS.PLACE]: places ? places.join(PARAM_VALUE_SEP) : "",
    [URL_PARAMS.ENCLOSED_PLACE_TYPE]: enclosedPlaceType,
    [URL_PARAMS.STAT_VAR]: statVars
      .map((sv) => {
        const svValue = { [STAT_VAR_PARAM_KEYS.DCID]: sv.dcid };
        if (sv.isPerCapita) {
          svValue[STAT_VAR_PARAM_KEYS.PER_CAPITA] = PARAM_VALUE_TRUE;
        }
        if (sv.isLog) {
          svValue[STAT_VAR_PARAM_KEYS.LOG] = PARAM_VALUE_TRUE;
        }
        if (sv.date) {
          svValue[STAT_VAR_PARAM_KEYS.DATE] = sv.date;
        }
        if (sv.denom) {
          svValue[STAT_VAR_PARAM_KEYS.DENOM] = sv.denom;
        }
        return JSON.stringify(svValue);
      })
      .join(PARAM_VALUE_SEP),
  };
  const displayValue = {};
  if (displayOptions.scatterPlaceLabels) {
    displayValue[DISPLAY_PARAM_KEYS.SCATTER_LABELS] = PARAM_VALUE_TRUE;
  }
  if (displayOptions.scatterQuadrants) {
    displayValue[DISPLAY_PARAM_KEYS.SCATTER_QUADRANTS] = PARAM_VALUE_TRUE;
  }
  if (!_.isEmpty(displayValue)) {
    params[URL_PARAMS.DISPLAY] = JSON.stringify(displayValue);
  }
  let hash = "";
  Object.keys(params).forEach((key, idx) => {
    if (_.isEmpty(params[key])) {
      return;
    }
    hash += `${idx === 0 ? "" : "&"}${key}=${params[key]}`;
  });
  return encodeURIComponent(hash);
}
