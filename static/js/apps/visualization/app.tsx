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

import React, { useState } from "react";

import { AppContextProvider } from "./app_context";
import { SelectedOptions } from "./selected_options";
import { SelectorPane } from "./selector_pane";
import { VisTypeSelector } from "./vis_type_selector";
import { Chart } from "./chart";

export function App(): JSX.Element {
  const [selectionComplete, setSelectionComplete] = useState(false);

  return (
    <AppContextProvider>
      <div className="visualization-app">
        <VisTypeSelector />
        <SelectedOptions />
        {selectionComplete ? (
          <Chart />
        ) : (
          <SelectorPane
            onSelectionComplete={() => setSelectionComplete(true)}
          />
        )}
      </div>
    </AppContextProvider>
  );
}
