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

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { Download } from "../../../components/elements/icons/download";
import { InfoSpark } from "../../../components/elements/icons/info_spark";
import { IntegrationInstructions } from "../../../components/elements/icons/integration_instructions";
import { LocationCity } from "../../../components/elements/icons/location_city";
import { Public } from "../../../components/elements/icons/public";
import { ScatterPlot } from "../../../components/elements/icons/scatter_plot";
import { Timeline } from "../../../components/elements/icons/timeline";
import { LinkIconBox } from "../../../components/elements/link_icon_box";
import { Tooltip } from "../../../components/elements/tooltip/tooltip";
import { resolveHref } from "../../base/utilities/utilities";

interface ToolsProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Record<string, string>;
}

export const Tools = ({ routes }: ToolsProps): ReactElement => {
  const theme = useTheme();
  return (
    <>
      <header
        css={css`
          width: 100%;
          max-width: ${theme.width.sm}px;
          margin-bottom: ${theme.spacing.xl}px;
          @media (max-width: ${theme.breakpoints.md}px) {
            max-width: 100%;
          }
        `}
      >
        <h3
          css={css`
            ${theme.typography.family.heading};
            ${theme.typography.heading.md};
            margin-bottom: ${theme.spacing.xl}px;
          `}
        >
          Data Commons tools
        </h3>
        <p
          css={css`
            ${theme.typography.family.text};
            ${theme.typography.text.lg};
          `}
        >
          Data Commons addresses offers data exploration tools and cloud-based
          APIs to access and integrate cleaned datasets.
        </p>
      </header>
      <div
        css={css`
          display: flex;
          align-items: stretch;
          flex-wrap: wrap;
          gap: ${theme.spacing.lg}px;
          margin: 0;
          padding: 0;
        `}
      >
        <LinkIconBox
          icon={<Public height={32} />}
          link={{
            id: "map",
            title: "Map Explorer",
            url: resolveHref("{tools.visualization}#visType=map", routes),
          }}
        />
        <LinkIconBox
          icon={<ScatterPlot height={32} />}
          link={{
            id: "scatter",
            title: "Scatter Plot Explorer",
            url: resolveHref("{tools.visualization}#visType=scatter", routes),
          }}
        />
        <LinkIconBox
          icon={<Timeline height={32} />}
          link={{
            id: "timeline",
            title: "Timelines Explorer",
            url: resolveHref("{tools.visualization}#visType=timeline", routes),
          }}
        />
        <LinkIconBox
          icon={<Download height={32} />}
          link={{
            id: "download",
            title: "Data Download Tool",
            url: resolveHref("{tools.download}", routes),
          }}
        />
        <LinkIconBox
          icon={<IntegrationInstructions height={32} />}
          link={{
            id: "api",
            title: "API Access",
            url: "https://docs.datacommons.org/api/",
          }}
        />
        {/* TODO (nick-next): Remove this before PR */}
        <div style={{ margin: "25px" }}>
          <Tooltip
            title={
              <>
                <h1>This is a tooltip</h1>
                <p>
                  <a href={"https://example.com"}>Another link.</a>
                  <br />
                  <em>Some emphasized text</em>
                  <br />
                  <a href={"https://google.com"}>
                    A link that can be clicked in both mobile and not.
                  </a>
                </p>
              </>
            }
            disableTouchListener
          >
            <button onClick={(): void => console.log("click")}>
              Hover over me or tap me
            </button>
          </Tooltip>
        </div>

        <div style={{ margin: "25px" }}>
          <Tooltip
            title={
              <>
                <h2>Follow Cursor</h2>
                <p>This tooltip follows the cursor.</p>
              </>
            }
            followCursor
          >
            <InfoSpark />
          </Tooltip>
        </div>

        <div style={{ margin: "25px" }}>
          <Tooltip
            title={
              <>
                <h2>Another icon tooltip</h2>
                <p>
                  <em>This cursor is to the left.</em>
                  <br />
                  <a href={"https://google.com"}>
                    A link that can be clicked in both mobile and not.
                  </a>
                </p>
              </>
            }
            placement="left"
            showArrow
          >
            <ScatterPlot />
          </Tooltip>
        </div>

        <div style={{ margin: "25px" }}>
          <Tooltip
            title="A simple tooltip, text trigger, text content"
            showArrow
          >
            Text Trigger
          </Tooltip>
        </div>

        <div style={{ margin: "25px" }}>
          <Tooltip
            title={
              <>
                <h2>Another icon tooltip</h2>
                <p>
                  <em>This one with a link </em>
                  <br />
                  <a href={"https://google.com"}>
                    A link that can be clicked in both mobile and not.
                  </a>
                </p>
              </>
            }
          >
            <LocationCity />
          </Tooltip>
        </div>

        <div style={{ margin: "25px" }}>
          <Tooltip
            title={
              <>
                <h2>Another icon tooltip</h2>
                <p>
                  <em>This one is to the right.</em>
                  <br />
                  <a href={"https://google.com"}>
                    A link that can be clicked in both mobile and not.
                  </a>
                </p>
              </>
            }
            placement={"right"}
          >
            <IntegrationInstructions />
          </Tooltip>
        </div>

        <div style={{ margin: "25px" }}>
          <Tooltip
            title={
              <>
                <h1>Popover</h1>
                <p>
                  This is always a popover
                  <br />
                  <a href={"https://google.com"}>
                    A link that can be clicked in both mobile and not.
                  </a>
                </p>
              </>
            }
            mode="popover"
          >
            <InfoSpark />
          </Tooltip>
        </div>

        {/* TODO (next-next): End of removal area */}
      </div>
    </>
  );
};
