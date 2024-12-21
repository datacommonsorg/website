/**
 * Copyright 2021 Google LLC
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
 * Default content for Stat Var Explorer when no stat var is selected.
 */

import React, { Component } from "react";

class Info extends Component {
  render(): JSX.Element {
    return (
      <div id="placeholder-container">
        <div className="start-instruction-tile">
          <i className="material-symbols-outlined icon">reminder</i>
          <p className="start-instruction-text">
            To start,{" "}
            <span className="d-none d-lg-inline">
              select a variable from the left panel
            </span>
            <span className="d-lg-none">
              click the &quot;Select variable&quot; button below
            </span>
            . Need more specific data? Filter by choosing a data source above.
          </p>
        </div>
      </div>
    );
  }
}

export { Info };
