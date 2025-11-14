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
 * Hook to memoize the stat var specs for a block given the following inputs:
 * the stat var key, snap-to-highest-coverage, denom or facet override.
 *
 * The purpose is to allow the parent of a tile to send that tile the stat
 * var specs in a stable array instance that only changes when one of those
 * instances changes (as the tiles are sensitive to re-rendering).
 */

import { useMemo, useRef } from "react";

import { DATE_HIGHEST_COVERAGE } from "../../shared/constants";
import { StatVarSpec } from "../../shared/types";
import { StatVarProvider } from "./stat_var_provider";

interface UseStatVarSpecResult {
  // Returns a stable array of StatVarSpec objects for the given keys.
  getStatVarSpec: (svKey: string[]) => StatVarSpec[];
  // Returns a stable StatVarSpec object for a single given key.
  getSingleStatVarSpec: (svDcid: string) => StatVarSpec;
}

/**
 * This hook keeps a per-block cache (tileSpecCache) so that identical inputs
 * return a stable array instance. This prevents block-level re-renders from
 * triggering refetches in the child unless one of the following changes: the stat
 * var key itself, the snap-to-highest-coverage setting, the denom or a
 * facet override.
 *
 * @param snapToHighestCoverage - Whether to snap to the date with the highest coverage.
 * @param useDenom - Whether to use a denominator for per capita calculations.
 * @param denom - The denominator to use.
 * @param facetOverrides - Any facet overrides.
 * @param statVarProvider - The stat var provider.
 * @returns An object containing getStatVarSpec and getSingleStatVarSpec functions.
 */
export function useStatVarSpec(
  snapToHighestCoverage: boolean,
  useDenom: boolean,
  denom: string,
  facetOverrides: Record<string, string>,
  statVarProvider: StatVarProvider
): UseStatVarSpecResult {
  const tileSpecCache = useRef<Map<string, StatVarSpec[]>>(new Map());

  return useMemo(() => {
    const getStatVarSpec = (svKey: string[]): StatVarSpec[] => {
      const key = JSON.stringify({
        svKey,
        blockDate: snapToHighestCoverage ? DATE_HIGHEST_COVERAGE : undefined,
        blockDenom: useDenom ? denom : "",
        facetOverrides,
      });

      if (tileSpecCache.current.has(key)) {
        return tileSpecCache.current.get(key);
      }

      const list = statVarProvider
        .getSpecList(svKey, {
          blockDate: snapToHighestCoverage ? DATE_HIGHEST_COVERAGE : undefined,
          blockDenom: useDenom ? denom : "",
        })
        .map((spec) => ({
          ...spec,
          facetId: facetOverrides[spec.statVar] || spec.facetId,
        }));

      tileSpecCache.current.set(key, list);
      return list;
    };

    const getSingleStatVarSpec = (svDcid: string): StatVarSpec =>
      getStatVarSpec([svDcid])[0];

    return { getStatVarSpec, getSingleStatVarSpec };
  }, [snapToHighestCoverage, useDenom, denom, facetOverrides, statVarProvider]);
}
