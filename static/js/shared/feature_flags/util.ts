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

// Feature flag names
export const AUTOCOMPLETE_FEATURE_FLAG = "autocomplete";
export const METADATA_FEATURE_FLAG = "metadata_modal";
export const FOLLOW_UP_QUESTIONS_EXPERIMENT = "follow_up_questions_experiment";
export const FOLLOW_UP_QUESTIONS_GA = "follow_up_questions_ga";
export const PAGE_OVERVIEW_EXPERIMENT = "page_overview_experiment";
export const PAGE_OVERVIEW_GA = "page_overview_ga";
export const PAGE_OVERVIEW_LINKS = "page_overview_links";
export const EXPLORE_RESULT_HEADER = "explore_result_header";
export const STANDARDIZED_VIS_TOOL_FEATURE_FLAG = "standardized_vis_tool";
export const ENABLE_STAT_VAR_AUTOCOMPLETE = "enable_stat_var_autocomplete";

// Feature flag URL parameters
export const ENABLE_FEATURE_URL_PARAM = "enable_feature";
export const DISABLE_FEATURE_URL_PARAM = "disable_feature";

/**
 * Returns true if the feature is enabled by the URL parameter.
 * @param featureName name of feature for which we want status.
 * @returns true if the feature is enabled by the URL parameter, false otherwise.
 */
export function isFeatureOverrideEnabled(featureName: string): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  const enabledFeatures = urlParams.getAll(ENABLE_FEATURE_URL_PARAM);
  return enabledFeatures.includes(featureName);
}

/**
 * Returns true if the feature is disabled by the URL parameter.
 * @param featureName name of feature for which we want status.
 * @returns true if the feature is disabled by the URL parameter, false otherwise.
 */
export function isFeatureOverrideDisabled(featureName: string): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  const disabledFeatures = urlParams.getAll(DISABLE_FEATURE_URL_PARAM);
  return disabledFeatures.includes(featureName);
}

/**
 * Returns the feature flags for the current environment.
 * @returns
 */
export function getFeatureFlags(): Record<
  string,
  { enabled: boolean; rollout_percentage?: number }
> {
  return globalThis.FEATURE_FLAGS as Record<
    string,
    { enabled: boolean; rollout_percentage?: number }
  >;
}

/**
 * Helper method to check if a feature is enabled with feature flags.
 *
 * Feature flags are set for each environment in
 * server/config/feature_flag_configs/<environment>.json
 *
 * Feature flags can be overridden and enabled manually
 * by adding ?enable_feature=<feature_name> to the URL
 * or disabled manually by adding ?disable_feature=<feature_name>
 * to the URL. If both overrides are provided, the feature will be enabled.
 *
 * Example:
 * https://datacommons.org/explore?enable_feature=autocomplete will enable the autocomplete feature.
 * https://datacommons.org/explore?enable_feature=autocomplete&enable_feature=metadata_modal will enable both the autocomplete and metadata_modal features.
 * https://datacommons.org/explore?disable_feature=autocomplete will disable the autocomplete feature.
 *
 * @param featureName name of feature for which we want status.
 * @returns Bool describing if the feature is enabled
 */
export function isFeatureEnabled(featureName: string): boolean {
  // Check URL params for feature flag enable overrides
  if (isFeatureOverrideEnabled(featureName)) {
    return true;
  }
  // Check URL params for feature flag disable overrides
  if (isFeatureOverrideDisabled(featureName)) {
    return false;
  }
  // Check if the feature flag is enabled in server config
  const featureFlags = getFeatureFlags();
  if (featureFlags && featureName in featureFlags) {
    const feature = featureFlags[featureName];
    if (!feature.enabled) {
      return false;
    }
    if (feature.rollout_percentage !== undefined) {
      return Math.random() * 100 < feature.rollout_percentage;
    }
    return true;
  }
  return false;
}
