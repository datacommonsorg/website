/**
 * Copyright 2025 Google LLC
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

export const FEATURE_FLAGS = globalThis.FEATURE_FLAGS;
export const AUTOCOMPLETE_FEATURE_FLAG = "autocomplete";
export const PLACE_PAGE_EXPERIMENT_FEATURE_FLAG = "autocomplete";
export const PLACE_PAGE_GA_FEATURE_FLAG = "autocomplete";

/**
 * Helper method to interact with feature flags.
 * @param featureName name of feature for which we want status.
 * @returns Bool describing if the feature is enabled
 */
export function isFeatureEnabled(featureName: string): boolean {
  if (FEATURE_FLAGS && featureName in FEATURE_FLAGS) {
    return FEATURE_FLAGS[featureName];
  }
  return false;
}
