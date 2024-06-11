/**
 * Copyright 2024 Google LLC
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

import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";

// By default will lazy load components that overlap the viewport
const DEFAULT_LAZY_LOAD_ROOT_MARGIN = "0px";

/**
 * Custom React hook that tracks whether a referenced element is in close
 * proximity to the viewport.
 * When the element comes close to the view (within specified margin) view, it
 * sets a flag (`shouldLoad`) to true.
 *
 * Usage:
 * const { shouldLoad, containerRef } = useLazyLoad();
 *
 * <div ref={containerRef}>
 *   {shouldLoad ? <YourContent /> : 'Loading...'}
 * </div>
 *
 * @param {string} rootMargin - Optional root margin configuration for the IntersectionObserver. Will lazy load the
 * component when it is within this margin of the viewport (Default: "0px")
 *
 * @returns {Object} An object containing:
 *   - {boolean} shouldLoad: A boolean flag indicating whether the element is in view and should trigger loading.
 *   - {React.MutableRefObject<HTMLDivElement | null>} containerRef: A ref to be assigned to the element to be observed.
 *
 */
export const useLazyLoad = (
  rootMargin?: string
): {
  shouldLoad: boolean;
  containerRef: MutableRefObject<HTMLDivElement | null>;
} => {
  const [isIntersecting, setIntersecting] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observer = useMemo(
    () =>
      new IntersectionObserver(
        ([entry]) => {
          setIntersecting(entry.isIntersecting);
        },
        {
          rootMargin: rootMargin || DEFAULT_LAZY_LOAD_ROOT_MARGIN,
        }
      ),
    []
  );

  useEffect(() => {
    if (isIntersecting && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [isIntersecting, shouldLoad]);

  useEffect(() => {
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      if (containerRef.current) {
        observer.disconnect();
      }
    };
  }, [observer]);
  return { shouldLoad, containerRef };
};
