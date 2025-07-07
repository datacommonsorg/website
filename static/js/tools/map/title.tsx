/**
 * Copyright 2022 Google LLC
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
 * Title component before a chart is shown.
 */

import React, { useContext } from "react";

import {
  isFeatureEnabled,
  STANDARDIZED_VIS_TOOL_FEATURE_FLAG,
} from "../../shared/feature_flags/util";
import { Context } from "./context";
import { ifShowChart } from "./util";

export function Title(): JSX.Element {
  const { statVar, placeInfo } = useContext(Context);
  const useStandardizedTitle = isFeatureEnabled(
    STANDARDIZED_VIS_TOOL_FEATURE_FLAG
  );
  return (
    <>
      {!ifShowChart(statVar.value, placeInfo.value) && useStandardizedTitle ? (
        <StandardizedTitle />
      ) : (
        <>
          <div className="app-header">
            <h1 className="mb-4">Map Explorer</h1>
            <a href="/tools/visualization#visType%3Dmap">
              Go back to the new Data Commons
            </a>
          </div>
        </>
      )}
    </>
  );
}

function StandardizedTitle(): JSX.Element {
  return (
    <div className="standardized-vis-tool-wrapper">
      <div className="standardized-vis-tool-header">
        <h1>Map Explorer</h1>
        <a href="/tools/visualization#visType%3Dmap">Switch tool version</a>
      </div>
      <div className="standardized-vis-tool-subheader">
        The map explorer helps you visualize how a statistical variable can vary
        across geographic regions.
      </div>
    </div>
  );
}
