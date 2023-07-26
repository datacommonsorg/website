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
import React, { useContext, useState } from "react";

import { isSelectionComplete } from "../../utils/app/visualization_utils";
import { AppContext } from "./app_context";
import { PlaceSelector } from "./place_selector";
import { PlaceTypeSelector } from "./place_type_selector";
import { SelectorWrapper } from "./selector_wrapper";
import { StatVarSelector } from "./stat_var_selector";
import { VIS_TYPE_SELECTOR_CONFIGS } from "./vis_type_configs";

export function SelectorPane(): JSX.Element {
  const { visType, places, enclosedPlaceType, statVars } =
    useContext(AppContext);
  const visTypeConfig = VIS_TYPE_SELECTOR_CONFIGS[visType];
  const [placeCollapsed, setPlaceCollapsed] = useState(!_.isEmpty(places));
  const [placeTypeCollapsed, setPlaceTypeCollapsed] = useState(
    _.isEmpty(places) || !_.isEmpty(enclosedPlaceType)
  );
  const [variableCollapsed, setVariableCollapsed] = useState(
    (!visTypeConfig.skipEnclosedPlaceType && _.isEmpty(enclosedPlaceType)) ||
      _.isEmpty(places)
  );
  const placeHeaderTitle = `1. Select${
    visTypeConfig.singlePlace ? " a" : ""
  } place${visTypeConfig.singlePlace ? "" : "s"}`;
  let titleNumVariables = "";
  if (visTypeConfig.numSv) {
    titleNumVariables =
      visTypeConfig.numSv === 1 ? "a" : String(visTypeConfig.numSv);
  }
  const svHeaderTitle = `${
    visTypeConfig.skipEnclosedPlaceType ? "2. " : "3. "
  }Select ${titleNumVariables ? titleNumVariables + " " : ""}Variable${
    visTypeConfig.numSv === 1 ? "" : "s"
  }`;

  if (isSelectionComplete(visType, places, enclosedPlaceType, statVars)) {
    return null;
  }

  return (
    <div className="selector-pane">
      <SelectorWrapper
        headerTitle={placeHeaderTitle}
        selectedValues={places.map((place) => place.name || place.dcid)}
        collapsed={placeCollapsed}
        setCollapsed={setPlaceCollapsed}
        disabled={false}
      >
        <PlaceSelector
          selectOnContinue={true}
          onNewSelection={() => {
            setPlaceCollapsed(true);
            if (visTypeConfig.skipEnclosedPlaceType) {
              setVariableCollapsed(false);
            } else {
              setPlaceTypeCollapsed(false);
            }
          }}
        />
      </SelectorWrapper>
      {!visTypeConfig.skipEnclosedPlaceType && (
        <SelectorWrapper
          headerTitle="2. Select a place type"
          selectedValues={[enclosedPlaceType]}
          collapsed={placeTypeCollapsed}
          setCollapsed={setPlaceTypeCollapsed}
          disabled={_.isEmpty(places)}
        >
          <PlaceTypeSelector
            onContinueClicked={() => {
              setPlaceTypeCollapsed(true);
              setVariableCollapsed(false);
            }}
          />
        </SelectorWrapper>
      )}
      <SelectorWrapper
        headerTitle={svHeaderTitle}
        selectedValues={statVars.map((sv) => sv.info.title || sv.dcid)}
        collapsed={variableCollapsed}
        setCollapsed={setVariableCollapsed}
        disabled={
          _.isEmpty(places) ||
          (!visTypeConfig.skipEnclosedPlaceType && !enclosedPlaceType)
        }
      >
        <StatVarSelector selectOnContinue={true} />
      </SelectorWrapper>
    </div>
  );
}
