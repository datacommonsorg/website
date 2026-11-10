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

/**
 * Fade the page out before following a link to `...?transition_animation=true`
 * (e.g. the narratives header link). The fade-in on arrival is handled by
 * base.html setting the `transition-animation` class server-side; styles are
 * in core.scss.
 */

const PARAM = "transition_animation";
const FADE_OUT_CLASS = "transition-animation-out";
// Keep in sync with the animation duration in core.scss.
const FADE_MS = 300;
// If the page is still here after this (download, cancelled beforeunload,
// slow network), un-fade it so the user isn't left on a blank page.
const RESTORE_MS = 1000;

/**
 * Returns the URL to navigate to if this link should fade the page out, else
 * null. Uses getAttribute so SVG <a> elements (whose `.href` is an
 * SVGAnimatedString) work too.
 */
export function getTransitionTarget(
  anchor: Element,
  currentHref: string
): string | null {
  const href = anchor.getAttribute("href");
  if (!href || anchor.hasAttribute("download")) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(href, currentHref);
  } catch {
    return null;
  }
  if (url.searchParams.get(PARAM) !== "true") {
    return null;
  }
  const current = new URL(currentHref);
  current.hash = "";
  const sameDocument = url.hash && url.href.split("#")[0] === current.href;
  return sameDocument ? null : url.href;
}

export function initTransitionAnimation(): void {
  const root = document.documentElement;

  document.addEventListener("click", (e: MouseEvent) => {
    const anchor = (e.target as Element)?.closest?.("a[href]");
    if (
      !anchor ||
      e.defaultPrevented ||
      e.button ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    const target = anchor.getAttribute("target");
    if (
      (target && target !== "_self") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const url = getTransitionTarget(anchor, window.location.href);
    if (!url) {
      return;
    }
    e.preventDefault();
    root.classList.add(FADE_OUT_CLASS);
    setTimeout(() => {
      window.location.href = url;
      setTimeout(() => root.classList.remove(FADE_OUT_CLASS), RESTORE_MS);
    }, FADE_MS);
  });

  // Back button can restore this page from bfcache while still faded out.
  window.addEventListener("pageshow", (e: PageTransitionEvent) => {
    if (e.persisted) {
      root.classList.remove(FADE_OUT_CLASS);
    }
  });
}
