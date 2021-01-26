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

import { translateVariableString } from "../i18n/i18n";

/**
 * Returns translated chart labels for each stats var. Used to distinguish
 * between stats var in grouped charts. If unavailable, the statsVar is
 * returned.
 *
 * NOTE: Prior to using this, ensure that i18n.loadLocaleData has been called
 * with ./js/i18n/compiled-lang/${locale}/stats_var_labels.json
 */
function getStatsVarLabel(statsVar: string): string {
  return translateVariableString(statsVar);
}

export { getStatsVarLabel };
