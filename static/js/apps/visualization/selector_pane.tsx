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
 * Component for selectors pane.
 */

import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";

import { AppContext } from "./app_context";
import { PlaceSelector } from "./place_selector";
import { PlaceTypeSelector } from "./place_type_selector";
import { SelectorWrapper } from "./selector_wrapper";
import { StatVarSelector } from "./stat_var_selector";
import { VIS_TYPE_CONFIG } from "./vis_type_configs";

enum SelectorType {
  PLACE = "place",
  PLACE_TYPE = "placeType",
  STAT_VARS = "statVars",
}

export function SelectorPane(): JSX.Element {
  const { visType, places, enclosedPlaceType, statVars } =
    useContext(AppContext);
  const visTypeConfig = VIS_TYPE_CONFIG[visType];
  const [availableSelectors, setAvailableSelectors] = useState(getSelectors());
  const placeHeaderTitle = `Select${
    visTypeConfig.singlePlace ? " a" : ""
  } place${visTypeConfig.singlePlace ? "" : "s"}`;
  // Header title for the stat var selector
  let svHeaderTitle = "";
  if (!visTypeConfig.numSv) {
    svHeaderTitle += "Select variables";
  } else if (visTypeConfig.numSv === 1) {
    svHeaderTitle += "Select a variable";
  } else {
    const numSvMissing = visTypeConfig.numSv - statVars.length;
    svHeaderTitle += `Select ${numSvMissing}${
      numSvMissing < visTypeConfig.numSv ? " more" : ""
    } variable${numSvMissing > 1 ? "s" : ""}`;
  }

  useEffect(() => {
    const newSelectors = getSelectors();
    if (!_.isEqual(newSelectors, availableSelectors)) {
      setAvailableSelectors(newSelectors);
    }
  }, [visType, places, enclosedPlaceType, statVars]);

  return (
    <div className="selector-pane">
      {availableSelectors.findIndex(
        (selector) => selector == SelectorType.PLACE
      ) >= 0 && (
        <SelectorWrapper
          headerTitle={placeHeaderTitle}
          selectedValues={places.map((place) => place.name || place.dcid)}
          disabled={false}
        >
          <PlaceSelector selectOnContinue={true} />
        </SelectorWrapper>
      )}
      {availableSelectors.findIndex(
        (selector) => selector == SelectorType.PLACE_TYPE
      ) >= 0 && (
        <SelectorWrapper
          headerTitle="Select a place type"
          selectedValues={[enclosedPlaceType]}
          disabled={
            _.isEmpty(availableSelectors) ||
            availableSelectors[0] !== SelectorType.PLACE_TYPE
          }
        >
          <PlaceTypeSelector selectOnContinue={true} />
        </SelectorWrapper>
      )}
      {availableSelectors.findIndex(
        (selector) => selector == SelectorType.STAT_VARS
      ) >= 0 && (
        <SelectorWrapper
          headerTitle={svHeaderTitle}
          selectedValues={statVars.map((sv) => sv.info.title || sv.dcid)}
          disabled={
            _.isEmpty(availableSelectors) ||
            availableSelectors[0] !== SelectorType.STAT_VARS
          }
        >
          <StatVarSelector selectOnContinue={true} />
        </SelectorWrapper>
      )}
    </div>
  );

  function getSelectors(): SelectorType[] {
    const selectorList = [];
    if (statVars.length < (visTypeConfig.numSv || 1)) {
      selectorList.push(SelectorType.STAT_VARS);
    }
    if (!visTypeConfig.skipEnclosedPlaceType && _.isEmpty(enclosedPlaceType)) {
      selectorList.push(SelectorType.PLACE_TYPE);
    }
    if (_.isEmpty(places)) {
      selectorList.push(SelectorType.PLACE);
    }
    return selectorList.reverse();
  }
}
