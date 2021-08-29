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

import React, { Component } from "react";

class Info extends Component {
  render(): JSX.Element {
    return (
      <div id="placeholder-container">
      <h1 className="mb-4">Statistical Variable Explorer</h1>
        <p>
          The statistical variable explorer provides information about what
          sorts of observations are available for each statistical variable.
          Select a variable from the pane in the left to get started. There are
          thousands of statistical variables to choose from, arranged
          in a topical hierarchy.
        </p>
      </div>
    );
  }
}

 export { Info };
