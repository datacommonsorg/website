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

import { Context } from "./context";
import { ifShowChart } from "./util";

export function Title(): JSX.Element {
  const { statVar, placeInfo } = useContext(Context);
  const hideVisLink =
    document.getElementById("metadata").dataset.hideVisLink === "True";

  return (
    <>
      {!ifShowChart(statVar.value, placeInfo.value) && (
        <div className="app-header">
          <h1 className="mb-4">Map Explorer</h1>
          {!hideVisLink && (
            <a href="/tools/visualization#visType%3Dmap">
              Go back to the new Data Commons
            </a>
          )}
        </div>
      )}
    </>
  );
}
