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
 * Entrypoint for Visualization Tool.
 */

import React from "react";
import ReactDOM from "react-dom";

import { loadLocaleData } from "../../i18n/i18n";
import {
  isFeatureEnabled,
  STANDARDIZED_VIS_TOOL_FEATURE_FLAG,
} from "../../shared/feature_flags/util";
import { App } from "./app";
import { getStandardizedToolUrl, getVisTypeFromHash } from "./redirect_utils";

window.addEventListener("load", (): void => {
  loadLocaleData("en", [import("../../i18n/compiled-lang/en/units.json")]).then(
    () => {
      // If standardized vis tool flag is on, redirect to the old tools

      // TODO(juliawu): Right now only timeline redirect is implemented.
      //                Implement the logic for the other tools.
      const visType = getVisTypeFromHash();
      if (
        isFeatureEnabled(STANDARDIZED_VIS_TOOL_FEATURE_FLAG) &&
        ["timeline", "scatter"].includes(visType)
      ) {
        window.location.href = getStandardizedToolUrl();
      } else {
        ReactDOM.render(
          React.createElement(App),
          document.getElementById("main-pane")
        );
      }
    }
  );
});
