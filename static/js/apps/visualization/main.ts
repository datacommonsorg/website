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

window.addEventListener("load", (): void => {
  loadLocaleData("en", [import("../../i18n/compiled-lang/en/units.json")]).then(
    () => {
      // If standardized vis tool flag is on, redirect to the old tools
      if (isFeatureEnabled(STANDARDIZED_VIS_TOOL_FEATURE_FLAG)) {
        // Get visualization type from URL hash parameters
        const currentHashParams = new URLSearchParams(
          window.location.hash.replace("#", "")
        );
        const visType = currentHashParams.get("visType") || "map";
        // Get hash without "visType" to pass to new tools
        const newHashParams = new URLSearchParams(currentHashParams.toString());
        newHashParams.delete("visType");
        const newHashString = newHashParams.toString()
          ? `#${newHashParams.toString()}`
          : "";
        // Redirect to old tools, passing along current hash
        window.location.href = `/tools/${visType}${newHashString}`;
      } else {
        ReactDOM.render(
          React.createElement(App),
          document.getElementById("main-pane")
        );
      }
    }
  );
});
