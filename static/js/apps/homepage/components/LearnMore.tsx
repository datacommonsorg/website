/**
 * Copyright 2024 Google LLC
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

import React, { ReactElement } from "react";

import { Routes } from "../../../shared/types/base";
import { resolveHref } from "../../base/utilities/utilities";

interface LearnMoreProps {
  routes: Routes;
}

const LearnMore = ({ routes }: LearnMoreProps): ReactElement => {
  return (
    <section>
      <div className="container">
        <div className="learn-more">
          <div id="learn-more-icon-container">
            <div id="learn-more-icon"></div>
          </div>
          <div className="learn-more-content">
            <h3>Learn More</h3>
            <p>
              Data forms the foundation of science, policy, and journalism, but
              its full potential is often limited. Data Commons addresses this
              by offering cloud-based APIs to access and integrate cleaned
              datasets, boosting their usability across different domains.
            </p>
            <div className="learn-more-links">
              <a href={resolveHref("static.about", routes)}>
                <span className="material-icons-outlined">arrow_forward</span>
                <span>About Data Commons</span>
              </a>
              <a href="https://docs.datacommons.org/tutorials/">
                <span className="material-icons-outlined">arrow_forward</span>
                <span>Tutorials</span>
              </a>
              <a href="https://docs.datacommons.org/">
                <span className="material-icons-outlined">arrow_forward</span>
                <span>Documentation</span>
              </a>
              <a href="https://docs.datacommons.org/api/">
                <span className="material-icons-outlined">arrow_forward</span>
                <span>API</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LearnMore;
