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

import { InfoSpark } from "../../../components/elements/icons/info_spark";
import { IntegrationInstructions } from "../../../components/elements/icons/integration_instructions";
import { LocationCity } from "../../../components/elements/icons/location_city";
import { ScatterPlot } from "../../../components/elements/icons/scatter_plot";
import { Tooltip } from "../../../components/elements/tooltip/tooltip";

interface DemoTooltipsProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Record<string, string>;
}

export const DemoTooltips = ({ routes }: DemoTooltipsProps): ReactElement => {
  const theme = useTheme();
  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        justify-content: flex-start;
        gap: 40px;
        .box {
          ${theme.radius.tertiary};
          background: ${theme.colors.background.secondary.light};
          padding: ${theme.spacing.lg}px;
        }
        p {
          ${theme.typography.family.text};
          ${theme.typography.text.md};
        }
      `}
    >
      <div className="box">
        <p>
          A button that can be click/tap or hover, with a rich content tooltip
        </p>
        <Tooltip
          title={
            <>
              <h1>Tooltip Title</h1>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit.{" "}
                <a href={"https://google.com"}>
                  A link that can be clicked in both mobile and not.
                </a>{" "}
                Voluptatibus <strong>ratione consectetur eligend</strong> i et
                neque saepe velit <em>architecto dolor.</em>
              </p>
            </>
          }
          disableTouchListener
        >
          <button
            onClick={(): void => console.log("click")}
            css={css`
              border: 0;
              ${theme.box.primary}
              ${theme.elevation.primary}
              ${theme.typography.family.text};
              ${theme.typography.text.md};
              ${theme.radius.primary};
              ${theme.colors.link.primary.base}
              line-height: 1rem;
              display: inline-flex;
              justify-content: center;
              align-items: center;
              gap: ${theme.spacing.sm}px;
              padding: 10px ${theme.spacing.lg}px 10px ${theme.spacing.md}px;
            `}
          >
            Hover over me or tap me
          </button>
        </Tooltip>
      </div>

      <div css={css``}>
        <Tooltip
          title={
            <>
              <h2>Follow Cursor</h2>
              <p>This tooltip follows the cursor.</p>
            </>
          }
          followCursor
          showArrow
        >
          <InfoSpark />
        </Tooltip>
      </div>

      <div className="box">
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

      <div className="box">
        <Tooltip title="A simple tooltip, text trigger, text content" showArrow>
          Text Trigger
        </Tooltip>
      </div>

      <div className="box">
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

      <div className="box">
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

      <div className="box">
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
    </div>
  );
};
