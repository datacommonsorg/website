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
 * A hook to provide a method for ensuring unique and sequential ids.
 * `prefix` is required and allows us to create multiple independent
 * counters - i.e. const tooltipId = useUniqueId("tooltip");
 *
 * Each prefix has its own independent count.
 */

import { useRef } from "react";

const idCounters: Record<string, number> = {};

export function useUniqueId(prefix: string): string {
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) {
    idCounters[prefix] = (idCounters[prefix] || 0) + 1;
    idRef.current = `${prefix}-${idCounters[prefix]}`;
  }
  return idRef.current;
}
