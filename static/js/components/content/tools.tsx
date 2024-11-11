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

import { resolveHref } from "../../apps/base/utilities/utilities";
import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../shared/ga_events";
import { Wrapper } from "./elements/Wrapper";

interface ToolsProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Record<string, string>;
}

const Tools = ({ routes }: ToolsProps): ReactElement => {
  return (
    <Wrapper colorVariant="light">
      <div className="header">
        <h3>Data Commons tools</h3>
        <p>
          Data Commons addresses offers data exploration tools and cloud-based
          APIs to access and integrate cleaned datasets.
        </p>
      </div>
      <ul className="tools-buttons">
        <li>
          <a
            href={resolveHref("{tools.visualization}#visType=map", routes)}
            id="map-button"
            onClick={(): void => {
              triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
                [GA_PARAM_ID]: "tools",
                [GA_PARAM_URL]: "map",
              });
            }}
          >
            <span className="tool-icon map"></span>
            Map Explorer
          </a>
        </li>
        <li>
          <a
            href={resolveHref("{tools.visualization}#visType=scatter", routes)}
            id="scatter-button"
            onClick={(): void => {
              triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
                [GA_PARAM_ID]: "tools",
                [GA_PARAM_URL]: "scatter",
              });
            }}
          >
            <span className="tool-icon scaterplot"></span>
            Scatter Plot Explorer
          </a>
        </li>
        <li>
          <a
            href={resolveHref("{tools.visualization}#visType=timeline", routes)}
            id="timeline-button"
            onClick={(): void => {
              triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
                [GA_PARAM_ID]: "tools",
                [GA_PARAM_URL]: "timeline",
              });
            }}
          >
            <span className="tool-icon timeline"></span>
            Timelines Explorer
          </a>
        </li>
        <li>
          <a
            href={resolveHref("{tools.download}", routes)}
            id="download-button"
            onClick={(): void => {
              triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
                [GA_PARAM_ID]: "tools",
                [GA_PARAM_URL]: "download",
              });
            }}
          >
            <span className="tool-icon download"></span>
            Data Download Tool
          </a>
        </li>
        <li>
          <a
            href="https://docs.datacommons.org/api/"
            id="api-button"
            onClick={(): void => {
              triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
                [GA_PARAM_ID]: "tools",
                [GA_PARAM_URL]: "api",
              });
            }}
          >
            <span className="tool-icon api"></span>
            API Access
          </a>
        </li>
      </ul>
    </Wrapper>
  );
};

export default Tools;
