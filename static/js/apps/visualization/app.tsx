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
 * Main component for Visualization Tool.
 */

import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";

import { Spinner } from "../../components/spinner";
import { AppContext, AppContextProvider } from "./app_context";
import { Chart } from "./chart";
import { Info } from "./info";
import { SelectedOptions } from "./selected_options";
import { SelectorPane } from "./selector_pane";
import { VisTypeSelector } from "./vis_type_selector";

export function App(): JSX.Element {
  return (
    <AppContextProvider>
      <div className="visualization-app">
        <VisTypeSelector />
        <MainPane />
      </div>
    </AppContextProvider>
  );
}

function MainPane(): JSX.Element {
  const { places, statVars, enclosedPlaceType, isContextLoading } =
    useContext(AppContext);
  const [showInfo, setShowInfo] = useState(
    _.isEmpty(places) && _.isEmpty(statVars) && _.isEmpty(enclosedPlaceType)
  );

  useEffect(() => {
    // When places, statVars, or enclosedPlaceType changes, check if we should
    // remove the info page.
    if (
      !_.isEmpty(places) ||
      !_.isEmpty(statVars) ||
      !_.isEmpty(enclosedPlaceType)
    ) {
      setShowInfo(false);
    }
  }, [places, statVars, enclosedPlaceType]);

  if (isContextLoading) {
    return (
      <div className="context-loading-spinner">
        <Spinner isOpen={true} />
      </div>
    );
  }

  return (
    <>
      {showInfo && <Info onStartClicked={() => setShowInfo(false)} />}
      {!showInfo && (
        <>
          <SelectedOptions />
          <SelectorPane />
          <Chart />
        </>
      )}
    </>
  );
}
