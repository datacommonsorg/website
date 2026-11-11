/**
 * Copyright 2026 Google LLC
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

import { getTransitionTarget } from "./transition_animation";

const CURRENT = "https://datacommons.org/explore?q=x";

function link(attrs: Record<string, string>, svg = false): Element {
  const a = svg
    ? document.createElementNS("http://www.w3.org/2000/svg", "a")
    : document.createElement("a");
  Object.entries(attrs).forEach(([k, v]) => a.setAttribute(k, v));
  return a;
}

test("getTransitionTarget", () => {
  expect(
    getTransitionTarget(
      link({ href: "http://localhost:3000/?transition_animation=true" }),
      CURRENT
    )
  ).toBe("http://localhost:3000/?transition_animation=true");
  // Relative + SVG anchors.
  expect(
    getTransitionTarget(
      link({ href: "/n?transition_animation=true" }, true),
      CURRENT
    )
  ).toBe("https://datacommons.org/n?transition_animation=true");
  // Substring look-alikes don't match.
  expect(
    getTransitionTarget(
      link({ href: "/?no_transition_animation=true" }),
      CURRENT
    )
  ).toBeNull();
  expect(
    getTransitionTarget(
      link({ href: "/?q=transition_animation=true" }),
      CURRENT
    )
  ).toBeNull();
  // Downloads and same-document hash links don't leave the page.
  expect(
    getTransitionTarget(
      link({ href: "/f.csv?transition_animation=true", download: "" }),
      CURRENT
    )
  ).toBeNull();
  expect(
    getTransitionTarget(
      link({ href: "#top" }),
      "https://datacommons.org/?transition_animation=true"
    )
  ).toBeNull();
  expect(
    getTransitionTarget(
      link({ href: "#" }),
      "https://datacommons.org/?transition_animation=true"
    )
  ).toBeNull();
  // Non-http(s) schemes are never followed.
  expect(
    getTransitionTarget(
      link({ href: "javascript:alert(1)?transition_animation=true" }),
      CURRENT
    )
  ).toBeNull();
  expect(getTransitionTarget(link({}), CURRENT)).toBeNull();
});
