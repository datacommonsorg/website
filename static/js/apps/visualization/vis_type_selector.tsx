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
 * Selector for choosing the type of visualization to show.
 */

import React, { useContext } from "react";

import { AppContext } from "./app_context";
import { ORDERED_VIS_TYPE, VIS_TYPE_CONFIG } from "./vis_type_configs";

export function VisTypeSelector(): JSX.Element {
  const { visType, setVisType } = useContext(AppContext);
  return (
    <div className="vis-type-selector">
      {ORDERED_VIS_TYPE.map((type) => {
        const visTypeConfig = VIS_TYPE_CONFIG[type];
        return (
          <div
            className={`vis-type-option${visType === type ? " selected" : ""}`}
            onClick={() => setVisType(type)}
            key={type}
          >
            <span className="material-icons-outlined">
              {visTypeConfig.icon}
            </span>
            <span className="label">{visTypeConfig.displayName}</span>
          </div>
        );
      })}
    </div>
  );
}
