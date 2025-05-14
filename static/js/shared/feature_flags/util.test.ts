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
 * - To enable a feature: add ?enable_<feature_name> to the URL
 * - To disable a feature: add ?disable_<feature_name> to the URL
 *
 * Example URLs:
 * - https://datacommons.org/explore?enable_autocomplete
 * - https://datacommons.org/explore?disable_autocomplete
 *
 * These URL overrides take precedence over the environment-specific flag settings
 */
import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";
import {
  DISABLE_FEATURE_FLAG_PREFIX,
  ENABLE_FEATURE_FLAG_PREFIX,
  isFeatureEnabled,
} from "./util";

describe("isFeatureEnabled", () => {
  const featureName = "testFeature";
  const enableParam = `${ENABLE_FEATURE_FLAG_PREFIX}${featureName}`;
  const disableParam = `${DISABLE_FEATURE_FLAG_PREFIX}${featureName}`;

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
  });

  afterEach(() => {
    // Restore window.location and FEATURE_FLAGS
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
    globalThis.FEATURE_FLAGS = originalFeatureFlags;
  });

  // Test URL parameter overrides
  test("returns true when enable param is present", () => {
    window.location.search = `?${enableParam}`;
    expect(isFeatureEnabled(featureName)).toBe(true);
  });

  test("returns false when disable param is present", () => {
    window.location.search = `?${disableParam}`;
    expect(isFeatureEnabled(featureName)).toBe(false);
  });

  test("returns false when no URL params are present", () => {
    window.location.search = "";
    expect(isFeatureEnabled(featureName)).toBe(false);
  });

  test("returns false when different URL params are present", () => {
    window.location.search = "?someOtherParam=true";
    expect(isFeatureEnabled(featureName)).toBe(false);
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
});
