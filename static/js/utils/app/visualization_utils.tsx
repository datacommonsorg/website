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
 * Util functions used by the visualization tool.
 */

import axios from "axios";
import _ from "lodash";
import React from "react";
import { FormGroup, Input, Label } from "reactstrap";

import { ContextStatVar } from "../../apps/visualization/app_context";
import {
  VIS_TYPE_CONFIG,
  VisType,
  VisTypeConfig,
} from "../../apps/visualization/vis_type_configs";
import {
  EARTH_NAMED_TYPED_PLACE,
  USA_PLACE_DCID,
} from "../../shared/constants";
import {
  GA_EVENT_TOOL_CHART_OPTION_CLICK,
  GA_PARAM_TOOL_CHART_OPTION,
  GA_VALUE_TOOL_CHART_OPTION_LOG_SCALE,
  GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
  triggerGAEvent,
} from "../../shared/ga_events";
import { NamedNode, NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { isChildPlaceOf } from "../../tools/shared_util";

const USA_CITY_CHILD_TYPES = ["CensusZipCodeTabulationArea", "City"];
const USA_COUNTY_CHILD_TYPES = ["Town", "Village", ...USA_CITY_CHILD_TYPES];
const USA_STATE_CHILD_TYPES = ["County", ...USA_COUNTY_CHILD_TYPES];
const USA_COUNTRY_CHILD_TYPES = ["State", ...USA_STATE_CHILD_TYPES];
const USA_CENSUS_DIV_CHILD_TYPES = ["State", ...USA_STATE_CHILD_TYPES];
const USA_CENSUS_REGION_CHILD_TYPES = [
  "CensusDivision",
  ...USA_CENSUS_DIV_CHILD_TYPES,
];

const USA_CHILD_PLACE_TYPES = {
  City: USA_CITY_CHILD_TYPES,
  Country: USA_COUNTRY_CHILD_TYPES,
  County: USA_COUNTY_CHILD_TYPES,
  State: USA_STATE_CHILD_TYPES,
  CensusDivision: USA_CENSUS_DIV_CHILD_TYPES,
  CensusRegion: USA_CENSUS_REGION_CHILD_TYPES,
};

const AA4_CHILD_PLACE_TYPES = ["AdministrativeArea5"];
const AA3_CHILD_PLACE_TYPES = ["AdministrativeArea4", ...AA4_CHILD_PLACE_TYPES];
const AA2_CHILD_PLACE_TYPES = ["AdministrativeArea3", ...AA3_CHILD_PLACE_TYPES];
const AA1_CHILD_PLACE_TYPES = ["AdministrativeArea2", ...AA2_CHILD_PLACE_TYPES];
const NUTS2_CHILD_PLACE_TYPES = ["EurostatNUTS3"];
const NUTS1_CHILD_PLACE_TYPES = ["EurostatNUTS2", ...NUTS2_CHILD_PLACE_TYPES];
const NON_USA_COUNTRY_PLACE_TYPES = [
  "AdministrativeArea1",
  ...AA1_CHILD_PLACE_TYPES,
  "EurostatNUTS1",
  ...NUTS1_CHILD_PLACE_TYPES,
];
const CONTINENT_PLACE_TYPES = ["Country", ...NON_USA_COUNTRY_PLACE_TYPES];
const CHILD_PLACE_TYPES = {
  AdministrativeArea1: AA1_CHILD_PLACE_TYPES,
  AdministrativeArea2: AA2_CHILD_PLACE_TYPES,
  AdministrativeArea3: AA3_CHILD_PLACE_TYPES,
  AdministrativeArea4: AA4_CHILD_PLACE_TYPES,
  Continent: CONTINENT_PLACE_TYPES,
  Country: NON_USA_COUNTRY_PLACE_TYPES,
  EurostatNUTS1: NUTS1_CHILD_PLACE_TYPES,
  EurostatNUTS2: NUTS2_CHILD_PLACE_TYPES,
  Planet: ["Continent", ...CONTINENT_PLACE_TYPES, ...USA_COUNTRY_CHILD_TYPES],
  State: AA1_CHILD_PLACE_TYPES,
};

const DEFAULT_DENOM = "Count_Person";

/**
 * Default function used to get enclosed place types for a place and list of its
 * parent places.
 * @param place place to get enclosed place types for
 * @param parentPlaces list of parent places for the place
 */
export function getEnclosedPlaceTypes(
  place: NamedTypedPlace,
  parentPlaces: NamedTypedPlace[]
): string[] {
  if (place.dcid === EARTH_NAMED_TYPED_PLACE.dcid) {
    return CHILD_PLACE_TYPES[EARTH_NAMED_TYPED_PLACE.types[0]];
  }
  if (_.isEmpty(place.types)) {
    return [];
  }
  const isUSPlace = isChildPlaceOf(place.dcid, USA_PLACE_DCID, parentPlaces);
  for (const type of place.types) {
    if (isUSPlace) {
      if (type in USA_CHILD_PLACE_TYPES) {
        return USA_CHILD_PLACE_TYPES[type];
      }
    } else {
      if (type in CHILD_PLACE_TYPES) {
        return CHILD_PLACE_TYPES[type];
      }
    }
  }
  return [];
}

/**
 * Returns whether or not selection of options is complete
 * @param visType selected vis type
 * @param places selected list of places
 * @param enclosedPlaceType selected enclosed place type
 * @param statVars selected list of stat vars
 */
export function isSelectionComplete(
  visType: string,
  places: NamedTypedPlace[],
  enclosedPlaceType: string,
  statVars: ContextStatVar[]
): boolean {
  const visTypeConfig = VIS_TYPE_CONFIG[visType];
  if (_.isEmpty(places)) {
    return false;
  }
  if (!visTypeConfig.skipEnclosedPlaceType && !enclosedPlaceType) {
    return false;
  }
  if (_.isEmpty(statVars)) {
    return false;
  }
  if (visTypeConfig.numSv && statVars.length < visTypeConfig.numSv) {
    return false;
  }
  return true;
}

interface InputInfo {
  isChecked: boolean;
  onUpdated: (isChecked: boolean) => void;
  label: string;
}

/**
 * Given a list of per capita and log inputs, gets the footer element.
 * @param perCapitaInputs list of per capita inputs
 * @param logInputs list of log inputs
 */
export function getFooterOptions(
  perCapitaInputs: InputInfo[],
  logInputs: InputInfo[]
): JSX.Element {
  if (_.isEmpty(perCapitaInputs) && _.isEmpty(logInputs)) {
    return null;
  }
  return (
    <div className="chart-footer-options">
      <div className="option-section">
        {perCapitaInputs.map((pcInput, idx) => {
          return (
            <span className="chart-option" key={`pc-${idx}`}>
              <FormGroup check>
                <Label check>
                  <Input
                    type="checkbox"
                    checked={pcInput.isChecked}
                    onChange={() => {
                      pcInput.onUpdated(!pcInput.isChecked);
                      if (!pcInput.isChecked) {
                        triggerGAEvent(GA_EVENT_TOOL_CHART_OPTION_CLICK, {
                          [GA_PARAM_TOOL_CHART_OPTION]:
                            GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
                        });
                      }
                    }}
                  />
                  {pcInput.label}
                </Label>
              </FormGroup>
            </span>
          );
        })}
      </div>
      <div className="option-section">
        {logInputs.map((logInput, idx) => {
          return (
            <span className="chart-option" key={`log-${idx}`}>
              <FormGroup check>
                <Label check>
                  <Input
                    type="checkbox"
                    checked={logInput.isChecked}
                    onChange={() => {
                      logInput.onUpdated(!logInput.isChecked);
                      if (!logInput.isChecked) {
                        triggerGAEvent(GA_EVENT_TOOL_CHART_OPTION_CLICK, {
                          [GA_PARAM_TOOL_CHART_OPTION]:
                            GA_VALUE_TOOL_CHART_OPTION_LOG_SCALE,
                        });
                      }
                    }}
                  />
                  {logInput.label}
                </Label>
              </FormGroup>
            </span>
          );
        })}
      </div>
    </div>
  );
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
  };
}

/**
 * Gets a promise to return a filtered list of stat vars
 * @param samplePlaces sample places used for the stat var hierarchy
 * @param statVars full list of stat vars
 * @param visTypeConfig the vis type config being used
 */
export function getFilteredStatVarPromise(
  samplePlaces: NamedNode[],
  statVars: ContextStatVar[],
  visTypeConfig: VisTypeConfig
): Promise<ContextStatVar[]> {
  if (_.isEmpty(samplePlaces) || _.isEmpty(statVars)) {
    return Promise.resolve([]);
  }
  return axios
    .post("/api/observation/existence", {
      entities: samplePlaces.map((place) => place.dcid),
      variables: statVars.map((sv) => sv.dcid),
    })
    .then((resp) => {
      const availableSVs = new Set();
      const numRequired = Math.min(
        samplePlaces.length,
        visTypeConfig.svHierarchyNumExistence || 1
      );
      for (const sv of statVars) {
        let numAvailable = 0;
        for (const entity in resp.data[sv.dcid]) {
          if (resp.data[sv.dcid][entity]) {
            numAvailable += 1;
          }
          if (numAvailable >= numRequired) {
            availableSVs.add(sv.dcid);
            break;
          }
        }
      }
      return statVars.filter((sv) => availableSVs.has(sv.dcid));
    })
    .catch(() => {
      return Promise.resolve(statVars);
    });
}
