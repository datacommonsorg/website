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

/**
 * Tests for the feature flag system.
 *
 * Feature flags are set for each environment in
 * server/config/feature_flag_configs/<environment>.json
 *
 * Feature flags can be overridden manually through URL parameters:
 * - To enable a feature or features: add ?enable_feature=<feature_name> to the URL
 *
 * Example URLs:
 * - https://datacommons.org/explore?enable_feature=testFeature
 * - https://datacommons.org/explore?enable_feature=testFeature&enable_feature=otherFeature
 *
 * These URL overrides take precedence over the environment-specific flag settings
 */
import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";

import {
  DISABLE_FEATURE_URL_PARAM,
  ENABLE_FEATURE_URL_PARAM,
  isFeatureEnabled,
} from "./util";

describe("isFeatureEnabled", () => {
  const featureName = "testFeature";
  const otherFeatureName = "otherFeature";

  // Store original window.location and FEATURE_FLAGS
  const originalLocation = window.location;
  const originalFeatureFlags = globalThis.FEATURE_FLAGS;

  beforeEach(() => {
    // Mock window.location
    Object.defineProperty(window, "location", {
      value: {
        ...originalLocation,
        search: "",
      },
      writable: true,
    });
    // Make a copy of the original FEATURE_FLAGS object
    globalThis.FEATURE_FLAGS = { ...originalFeatureFlags };
  });

  afterEach(() => {
    // Restore window.location and FEATURE_FLAGS
    Object.defineProperty(window, "location", {
      value: originalLocation,
    });
    // Restore the original FEATURE_FLAGS object
    globalThis.FEATURE_FLAGS = originalFeatureFlags;
  });

  // Test URL parameter overrides
  test("returns true when enable param is present", () => {
    window.location.search = `?${ENABLE_FEATURE_URL_PARAM}=${featureName}`;
    expect(isFeatureEnabled(featureName)).toBe(true);
  });

  test("returns false when different URL params are present", () => {
    window.location.search = `?${ENABLE_FEATURE_URL_PARAM}=INVALID_${featureName}`;
    expect(isFeatureEnabled(featureName)).toBe(false);
  });

  test("returns false when no URL params are present", () => {
    window.location.search = "";
    expect(isFeatureEnabled(featureName)).toBe(false);
  });

  test("returns true when multiple features are enabled", () => {
    window.location.search = `?${ENABLE_FEATURE_URL_PARAM}=${featureName}&${ENABLE_FEATURE_URL_PARAM}=${otherFeatureName}`;
    expect(isFeatureEnabled(featureName)).toBe(true);
    expect(isFeatureEnabled(otherFeatureName)).toBe(true);
    expect(isFeatureEnabled("invalidFeature")).toBe(false);
  });

  // Test environment-specific feature flag settings
  test("returns true when feature flag is enabled in FEATURE_FLAGS", () => {
    window.location.search = "";
    globalThis.FEATURE_FLAGS = { [featureName]: true };
    expect(isFeatureEnabled(featureName)).toBe(true);
  });

  test("returns false when feature flag is disabled in FEATURE_FLAGS", () => {
    window.location.search = "";
    globalThis.FEATURE_FLAGS = { [featureName]: false };
    expect(isFeatureEnabled(featureName)).toBe(false);
  });

  // Test disabling feature flags
  test("returns false when disable param is present", () => {
    window.location.search = `?${DISABLE_FEATURE_URL_PARAM}=${featureName}`;
    globalThis.FEATURE_FLAGS = { [featureName]: true };
    expect(isFeatureEnabled(featureName)).toBe(false);
  });

  test("keyword in url but not as a query parameter does not override", () => {
    // test case: url is missing the '?' in front
    window.location.href = `/${DISABLE_FEATURE_URL_PARAM}=${featureName}`;
    globalThis.FEATURE_FLAGS = { [featureName]: true };
    expect(isFeatureEnabled(featureName)).toBe(true);
  });
});
