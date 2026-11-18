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

export function getOutArcRowElementId(prop: string, index = 0): string {
  return `browser-arc-${prop}-${index}`;
}

export function getInArcSubsectionElementId(
  incomingType: string,
  prop: string
): string {
  return `${incomingType}-${prop}`;
}

/**
 * Validates and normalizes an external URL string for safe use in an `href`
 * attribute. Strictly allowlists `http:` and `https:` protocols and rejects
 * whitespace or executable schemes (such as `javascript:` or `data:`) to
 * prevent XSS. Returns null when the input is not a valid HTTP(S) URL.
 */
export function sanitizeHttpUrl(value?: string): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed) || /\s/.test(trimmed)) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      !parsed.hostname
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Returns true if the given value is a standalone valid HTTP or HTTPS URL.
 */
export function isHttpUrl(value?: string): boolean {
  return sanitizeHttpUrl(value) !== null;
}
