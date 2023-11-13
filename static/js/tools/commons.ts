/**
 * Copyright 2020 Google LLC
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
 * Interface class to filter stats vars. This should be
 * implemented as a concrete class based on specific use case.
 */
interface StatsVarFilterInterface {
  isValid(statsVar: string): boolean;
}

/**
 * StatsVar filter class for timeline tool.
 */
class TimelineStatsVarFilter implements StatsVarFilterInterface {
  statsVars: Set<string>;
  isValid(statsVar: string): boolean {
    return this.statsVars.has(statsVar);
  }
  constructor(statsVars: Set<string>) {
    this.statsVars = statsVars;
  }
}

/**
 * StatsVar filter for choropleth tool.
 */
class ChoroplethStatsVarFilter implements StatsVarFilterInterface {
  isValid(statsVar: string): boolean {
    // TODO(shifucun): add the actual logic.
    return !!statsVar;
  }
}

/**
 * StatsVar filter that does not filter and allows all non-null stats vars.
 */
class NoopStatsVarFilter implements StatsVarFilterInterface {
  isValid(statsVar: string): boolean {
    return !!statsVar;
  }
}

export {
  ChoroplethStatsVarFilter,
  NoopStatsVarFilter,
  StatsVarFilterInterface,
  TimelineStatsVarFilter,
};
