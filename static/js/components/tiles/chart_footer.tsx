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
 * Footer for charts in tiles.
 */

import _ from "lodash";
import React from "react";

interface ChartFooterPropType {
  handleEmbed?: () => void;
  // Link to explore more. Only show explore button if this object is non-empty.
  exploreLink?: { displayText: string; url: string };
  children?: React.ReactNode;
}

export function ChartFooter(props: ChartFooterPropType): JSX.Element {
  if (!props.handleEmbed && !props.exploreLink) {
    return null;
  }
  return (
    <footer id="chart-container-footer">
      <slot name="footer" {...{ part: "footer" }}></slot>
      <div className="main-footer-section">
        <div className="outlinks">
          {props.handleEmbed && (
            <div className="outlink-item">
              <span className="material-icons-outlined">download</span>
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  props.handleEmbed();
                }}
              >
                Download
              </a>
            </div>
          )}
          {props.exploreLink && (
            <div className="outlink-item">
              <span className="material-icons-outlined">timeline</span>
              <a
                href={props.exploreLink.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                Explore in {props.exploreLink.displayText}
              </a>
            </div>
          )}
        </div>
        {props.children}
      </div>
    </footer>
  );
}
