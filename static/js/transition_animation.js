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

/*
 * `?transition_animation=true`: start blank and fade the page in (e.g. arriving from the
 * narratives app). Links to `...?transition_animation=true` (the narrative header link) fade
 * the page out before navigating.
 *
 * Copied verbatim (not bundled) and loaded synchronously in <head> so the
 * class is set before first paint.
 */
(function () {
  var root = document.documentElement;
  if (new URLSearchParams(location.search).get("transition_animation") === "true") {
    root.classList.add("transition-animation");
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href*="transition_animation=true"]');
    if (
      !a ||
      e.defaultPrevented ||
      e.button ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (a.target && a.target !== "_self") ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    e.preventDefault();
    root.classList.add("transition-animation-out");
    setTimeout(function () {
      location.href = a.href;
    }, 300);
  });
  // Back button can restore this page from bfcache while still faded out.
  addEventListener("pageshow", function (e) {
    if (e.persisted) root.classList.remove("transition-animation-out");
  });
})();
