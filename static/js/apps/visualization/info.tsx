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
 * Landing Page for Visualization Tool.
 */

import React, { useContext } from "react";

import { AppContext } from "./app_context";
import { VIS_TYPE_CONFIG } from "./vis_type_configs";

interface InfoPropType {
  onStartClicked: () => void;
}

export function Info(props: InfoPropType): JSX.Element {
  const { visType } = useContext(AppContext);

  return (
    <div className="info-pane container">
      {VIS_TYPE_CONFIG[visType].getInfoContent()}
      <div className="actions">
        <div
          className="primary-button start-button"
          onClick={props.onStartClicked}
        >
          Start
        </div>
        <a href={VIS_TYPE_CONFIG[visType].oldToolUrl}>
          Switch back to the old tool
        </a>
      </div>
    </div>
  );
}
