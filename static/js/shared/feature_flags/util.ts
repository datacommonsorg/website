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

export function getFeatureFlags() {
  return globalThis.FEATURE_FLAGS;
}

export const AUTOCOMPLETE_FEATURE_FLAG = "autocomplete";
export const METADATA_FEATURE_FLAG = "metadata_modal";
export const ENABLE_FEATURE_FLAG_PREFIX = "enable_";
export const DISABLE_FEATURE_FLAG_PREFIX = "disable_";

/**
 * Helper method to check if a feature is enabled with feature flags.
 *
 * Feature flags are set for each environment in
 * server/config/feature_flag_configs/<environment>.json
 *
 * Feature flags can be overridden and enabled or disabled manually
 * by adding ?enable_<feature_name> or ?disable_<feature_name> to the URL.
 *
 * Example:
 * https://datacommons.org/explore?enable_autocomplete will enable the autocomplete feature.
 * https://datacommons.org/explore?disable_autocomplete will disable the autocomplete feature.
 *
 * @param featureName name of feature for which we want status.
 * @returns Bool describing if the feature is enabled
 */
export function isFeatureEnabled(featureName: string): boolean {
  // Check URL params for feature flag overrides
  const urlParams = new URLSearchParams(window.location.search);
  const enableParam = `${ENABLE_FEATURE_FLAG_PREFIX}${featureName}`;
  const disableParam = `${DISABLE_FEATURE_FLAG_PREFIX}${featureName}`;
  if (urlParams.has(enableParam)) {
    return true;
  }
  if (urlParams.has(disableParam)) {
    return false;
  }
  const featureFlags = getFeatureFlags();
  if (featureFlags && featureName in featureFlags) {
    return featureFlags[featureName];
  }
  return false;
}
