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

import {
  isFeatureEnabled,
  STANDARDIZED_VIS_TOOL_FEATURE_FLAG,
} from "../../shared/feature_flags/util";
import { AppContext } from "./app_context";
import { getStandardizedToolUrl } from "./redirect_utils";
import { ORDERED_VIS_TYPE, VIS_TYPE_CONFIG, VisType } from "./vis_type_configs";

export function VisTypeSelector(): JSX.Element {
  const { visType, setVisType } = useContext(AppContext);
  return (
    <div className="vis-type-selector">
      {ORDERED_VIS_TYPE.map((type) => {
        const visTypeConfig = VIS_TYPE_CONFIG[type];
        return (
          <div
            className={`vis-type-option${visType === type ? " selected" : ""}`}
            onClick={(): void => onTypeSelected(type)}
            key={type}
          >
            <span className="label">{visTypeConfig.displayName}</span>
          </div>
        );
      })}
    </div>
  );

  function onTypeSelected(type: VisType): void {
    if (
      isFeatureEnabled(STANDARDIZED_VIS_TOOL_FEATURE_FLAG) &&
      [VisType.TIMELINE].includes(type)
    ) {
      // redirect to old tool
      window.location.href = getStandardizedToolUrl(type);
    } else {
      setVisType(type);
    }
  }
}
