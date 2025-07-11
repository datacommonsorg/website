/**
 * Copyright 2020 Google LLC
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

import React from "react";
import ReactDOM from "react-dom";

import { getLocaleFromUrl, loadLocaleData } from "../../i18n/i18n";
import {
  isFeatureEnabled,
  STANDARDIZED_VIS_TOOL_FEATURE_FLAG,
} from "../../shared/feature_flags/util";
import { AppWithContext } from "./app";

window.addEventListener("load", (): void => {
  // Adjust page styling if using the standardized UI feature flag is enabled
  // TODO(juliawu): Remove this logic once vis tool unification launches
  if (isFeatureEnabled(STANDARDIZED_VIS_TOOL_FEATURE_FLAG)) {
    document.getElementById("main-pane").className = "standardized-vis-tool";
  }
  const locale = getLocaleFromUrl();
  loadLocaleData(locale, [
    import(`../../i18n/compiled-lang/${locale}/units.json`),
  ]).then(() => {
    ReactDOM.render(
      React.createElement(AppWithContext),
      document.getElementById("main-pane")
    );
  });
});
