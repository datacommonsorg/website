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

import { resolveHref } from "../../base/utilities/utilities";

interface ToolsProps {
  routes: Record<string, string>;
}

const Tools = ({ routes }: ToolsProps): ReactElement => {
  return (
    <section className="tools">
      <div className="container">
        <div className="tools-description">
          <h3 className="tools-description-header">Data Commons Tools</h3>
          <h4 className="tools-description-subheader">
            Explore the public database through these tools
          </h4>
        </div>
        <div className="tools-icons">
          <div className="tool-buttons-container">
            <a
              href={resolveHref("{tools.visualization}#visType=map", routes)}
              id="map-button"
              className="tool-button"
            >
              <div className="tool-icon"></div>
              <span>Map explorer</span>
            </a>
            <a
              href={resolveHref(
                "{tools.visualization}#visType=scatter",
                routes
              )}
              id="scatter-button"
              className="tool-button"
            >
              <div className="tool-icon"></div>
              <span>Scatter plots</span>
            </a>
            <a
              href={resolveHref(
                "{tools.visualization}#visType=timeline",
                routes
              )}
              id="timeline-button"
              className="tool-button"
            >
              <div className="tool-icon"></div>
              <span>Timelines</span>
            </a>
            <a
              href={resolveHref("place.place", routes)}
              id="place-button"
              className="tool-button"
            >
              <div className="tool-icon"></div>
              <span>Place explorer</span>
            </a>
            <a
              href={resolveHref("tools.download", routes)}
              id="download-button"
              className="tool-button"
            >
              <div className="tool-icon"></div>
              <span>Data download</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Tools;
