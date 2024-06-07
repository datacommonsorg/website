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

/**
 * Component to edit the facet for a list of stat vars.
 */

import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";

/**
 * Custom React hook that tracks whether a referenced element is in the viewport.
 * When the element comes into view, it sets a flag (`shouldLoad`) to true.
 *
 * @returns {Object} An object containing:
 *   - {boolean} shouldLoad: A boolean flag indicating whether the element is in view and should trigger loading.
 *   - {React.MutableRefObject<HTMLDivElement | null>} elementRef: A ref to be assigned to the element to be observed.
 *
 * Usage:
 * const { shouldLoad, elementRef } = useInView();
 *
 * <div ref={elementRef}>
 *   {shouldLoad ? <YourContent /> : 'Loading...'}
 * </div>
 */
const useLazyLoad = (): {
  shouldLoad: boolean;
  containerRef: MutableRefObject<HTMLDivElement | null>;
} => {
  const [isIntersecting, setIntersecting] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const observer = useMemo(
    () =>
      new IntersectionObserver(([entry]) =>
        setIntersecting(entry.isIntersecting)
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

export default useLazyLoad;
