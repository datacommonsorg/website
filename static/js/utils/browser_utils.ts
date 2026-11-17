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
 * Returns true if the given value is a standalone valid HTTP or HTTPS URL.
 * Strictly allowlists http: and https: protocols to prevent javascript:/data: XSS.
 */
export function isHttpUrl(value?: string): boolean {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  if (
    (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) ||
    /\s/.test(trimmed)
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}
