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

import { AppContext } from "./app_context";
import { PlaceSelector } from "./place_selector";
import { PlaceTypeSelector } from "./place_type_selector";
import { StatVarSelector } from "./stat_var_selector";
import { VIS_TYPE_SELECTOR_CONFIGS } from "./vis_type_configs";

interface SelectorPanePropType {
  onSelectionComplete: () => void;
}

export function SelectorPane(props: SelectorPanePropType): JSX.Element {
  const { visType, places, enclosedPlaceType } = useContext(AppContext);
  const visTypeConfig = VIS_TYPE_SELECTOR_CONFIGS[visType];
  const [childPlaceTypeCollapsed, setChildPlaceTypeCollapsed] = useState(
    _.isEmpty(places) || !_.isEmpty(enclosedPlaceType)
  );
  const [variableCollapsed, setVariableCollapsed] = useState(
    (!visTypeConfig.skipEnclosedPlaceType && _.isEmpty(enclosedPlaceType)) ||
      _.isEmpty(places)
  );

  return (
    <div className="selector-pane">
      <PlaceSelector
        titlePrefix="1. "
        onContinueClicked={() =>
          visTypeConfig.skipEnclosedPlaceType
            ? setVariableCollapsed(false)
            : setChildPlaceTypeCollapsed(false)
        }
      />
      {!visTypeConfig.skipEnclosedPlaceType && (
        <PlaceTypeSelector
          titlePrefix="2. "
          onContinueClicked={() => setVariableCollapsed(false)}
          collapsed={childPlaceTypeCollapsed}
          setCollapsed={setChildPlaceTypeCollapsed}
        />
      )}
      <StatVarSelector
        titlePrefix={visTypeConfig.skipEnclosedPlaceType ? "2. " : "3. "}
        onContinueClicked={props.onSelectionComplete}
        collapsed={variableCollapsed}
        setCollapsed={setVariableCollapsed}
      />
    </div>
  );
}
