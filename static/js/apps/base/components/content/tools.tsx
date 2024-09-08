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

/**
 * A component that renders the tools section of the home page.
 */

import React, { ReactElement } from "react";

import { resolveHref } from "../../utilities/utilities";

interface ToolsProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Record<string, string>;
}

const Tools = ({ routes }: ToolsProps): ReactElement => {
  return (
    <section className="tools">
      <div className="container">
        <div className="big-description">
          <h3>Data Commons Tools</h3>
          <p>Data forms the foundation of science, policy, and journalism, but its full potential is often limited. Data Commons addresses this by offering data exploration tools and cloud-based APIs to access and integrate cleaned datasets, boosting their usability across different domains.</p>
        </div>
        <ul className="tools-buttons">
          <li>
            <a
              href={resolveHref("{tools.visualization}#visType=map", routes)}
              id="map-button"
            >
              <span className="tool-icon map"></span>
              Map explorer
            </a>
          </li>
          <li>
            <a
              href={resolveHref(
                "{tools.visualization}#visType=scatter",
                routes
              )}
              id="scatter-button"
            >
              <span className="tool-icon scaterplot"></span>
              Scatter plot tool
            </a>
          </li>
          <li>
            <a
              href={resolveHref(
                "{tools.visualization}#visType=timeline",
                routes
              )}
              id="timeline-button"
            >
              <span className="tool-icon timeline"></span>
              Timeline plot tool
            </a>
          </li>
          <li>
            <a
              href={resolveHref("tools.download", routes)}
              id="download-button"
            >
              <span className="tool-icon download"></span>
              Place explorer
            </a>
          </li>
          <li>
            <a
              href={resolveHref("tools.api", routes)}
              id="api-button"
            >
              <span className="tool-icon api"></span>
              API access
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
};

export default Tools;