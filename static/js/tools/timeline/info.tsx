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

import _ from "lodash";
import React, { Component } from "react";

import { MemoizedInfoExamples } from "../shared/info_examples";

class Info extends Component {
  render(): JSX.Element {
    return (
      <div id="placeholder-container">
        <p>
          The timelines tool helps you explore trends for the statistical
          variables that appear in the pane to the left. Enter a place --- city,
          state, zip, county, country --- in the search box above and then pick
          one or more statistical variables in the pane. There are thousands of
          statistical variables to choose from, arranged in a topical hierarchy.
        </p>
        {!_.isEmpty(window.infoConfig["timeline"]) && (
          <p>
            Or you can start your exploration from these interesting points ...
          </p>
        )}

        <MemoizedInfoExamples configKey="timeline" />

        <p>Take the data and use it on your site!</p>
        <p>
          <a href="mailto:collaborations@datacommons.org">Send</a> us your
          discoveries!
        </p>
      </div>
    );
  }
}

export const MemoizedInfo = React.memo(Info);
