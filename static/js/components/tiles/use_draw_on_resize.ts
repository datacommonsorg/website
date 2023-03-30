/**
 * Copyright 2023 Google LLC
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
import _ from "lodash";
import { useEffect } from "react";

// Number of ms to debounce re-draws when chart is resized
export const RESIZE_DEBOUNCE_INTERVAL_MS = 10;

export function useDrawOnResize(drawFn: () => void, chartContainer: Element) {
  useEffect(() => {
    if (!chartContainer) {
      return;
    }
    const debouncedHandler = _.debounce(drawFn, RESIZE_DEBOUNCE_INTERVAL_MS);
    const resizeObserver = new ResizeObserver(debouncedHandler);
    resizeObserver.observe(chartContainer);
    return () => {
      resizeObserver.unobserve(chartContainer);
      debouncedHandler.cancel();
    };
  }, [drawFn, chartContainer]);
}
