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

/**
 * Component that draws a chart based off the state of the visualization tool.
 */

import React, { useContext } from "react";

import { AppContext } from "./app_context";

export function Chart(): JSX.Element {
  const { visType, places, statVars, enclosedPlaceType } =
    useContext(AppContext);
  return (
    <div>
      Plotting
      <div>{visType}</div>
      <div>{places.map((place) => place.dcid).join(", ")}</div>
      <div>{statVars.map((sv) => sv.info.title || sv.dcid).join(", ")}</div>
      <div>{enclosedPlaceType}</div>
    </div>
  );
}
