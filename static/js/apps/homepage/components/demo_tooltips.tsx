/**
 * Copyright 2025 Google LLC
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
 * A component that demos the tooltips.
 */

// TODO (nick-next): Remove this file before PR is merged into master.

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { InfoSpark } from "../../../components/elements/icons/info_spark";
import { IntegrationInstructions } from "../../../components/elements/icons/integration_instructions";
import { LocationCity } from "../../../components/elements/icons/location_city";
import { ScatterPlot } from "../../../components/elements/icons/scatter_plot";
import { Tooltip } from "../../../components/elements/tooltip/tooltip";

export const DemoTooltips = (): ReactElement => {
  const theme = useTheme();
  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        justify-content: flex-start;
        gap: 40px;
        .grid {
          display: flex;
          gap: ${theme.spacing.lg}px;
        }
        .box {
          ${theme.radius.tertiary};
          background: ${theme.colors.background.secondary.light};
          padding: ${theme.spacing.lg}px;
        }
        p {
          ${theme.typography.family.text};
          ${theme.typography.text.md};
        }
        ul {
          margin: 0 0 20px 20px;
          padding: 0;
        }
        li {
          ${theme.typography.family.text};
          ${theme.typography.text.md};
        }
        h4 {
          ${theme.typography.family.heading};
          ${theme.typography.text.md};
          font-weight: 900;
        }
      `}
    >
      <div className="box">
        <Tooltip
          title="A simple tooltip, text trigger, text content"
          showArrow
          cursor={"help"}
        >
          Text Trigger
        </Tooltip>
        <hr />
        <h4>Description:</h4>
        <p>
          A simple tooltip with an empty string of text as trigger with the
          arrow option
        </p>
        <h4>Details:</h4>
        <ul>
          <li>
            <strong>Trigger:</strong> Text String Element
          </li>
          <li>
            <strong>Content:</strong> Test string Element
          </li>
          <li>
            <strong>showArrow:</strong> true
          </li>
          <li>
            <strong>cursor:</strong> help
          </li>
        </ul>
      </div>

      <div className="box">
        <Tooltip
          title={
            <>
              <h1>Tooltip Title</h1>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
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
            Hover me
          </button>
        </Tooltip>
        <hr />
        <h4>Description:</h4>
        <p>
          A button that can be hovered, with a rich content tooltip. The button
          has an action on click, so touch popovers are disabled.
        </p>
        <h4>Details:</h4>
        <ul>
          <li>
            <strong>Trigger:</strong> HTML (React) Element
          </li>
          <li>
            <strong>Content:</strong> HTML (React) Element
          </li>
          <li>
            <strong>disableTouchListener:</strong> true
          </li>
        </ul>
      </div>

      <div className="box">
        <Tooltip
          title={
            <>
              <h2>Follow Cursor</h2>
              <p>This tooltip follows the cursor.</p>
            </>
          }
          followCursor
          showArrow
          cursor={"default"}
        >
          <p>A following cursor tooltip can be used with long elements</p>
        </Tooltip>
        <hr />
        <h4>Description:</h4>
        <p>
          A button that can be hovered, with a rich content tooltip. The button
          has an action on click, so touch popovers are disabled.
        </p>
        <h4>Details:</h4>
        <ul>
          <li>
            <strong>Trigger:</strong> HTML (React) Element
          </li>
          <li>
            <strong>Content:</strong> HTML (React) Element
          </li>
          <li>
            <strong>followCursor:</strong> true
          </li>
          <li>
            <strong>showArrow:</strong> true
          </li>
          <li>
            <strong>cursor:</strong> default
          </li>
        </ul>
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
        <hr />
        <h4>Description:</h4>
        <p>
          An element that can be hovered, with a rich content tooltip including
          clickable links.
        </p>
        <h4>Details:</h4>
        <ul>
          <li>
            <strong>Trigger:</strong> HTML (React) Element
          </li>
          <li>
            <strong>Content:</strong> HTML (React) Element
          </li>
          <li>
            <strong>showArrow:</strong> true
          </li>
          <li>
            <strong>placement:</strong> left
          </li>
        </ul>
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
        <hr />
        <h4>Description:</h4>
        <p>
          A popover dialog activated trough click, permament with a close icon,
          close on click outside or using the ESC key.
        </p>
        <h4>Details:</h4>
        <ul>
          <li>
            <strong>Trigger:</strong> HTML (React) Element
          </li>
          <li>
            <strong>Content:</strong> HTML (React) Element
          </li>
          <li>
            <strong>mode:</strong> popover
          </li>
        </ul>
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
          placement="left"
        >
          <p>Tooltip appearing on the Left</p>
        </Tooltip>
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
          placement="right"
        >
          <p>Tooltip appearing on the Right</p>
        </Tooltip>
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
          placement="top"
        >
          <p>Tooltip appearing on the Top</p>
        </Tooltip>
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
          placement="bottom"
        >
          <p>Tooltip appearing on the Bottom</p>
        </Tooltip>
        <hr />
        <h4>Description:</h4>
        <p>
          An element that can be hovered, with a rich content tooltip including
          clickable links.
        </p>
        <h4>Details:</h4>
        <ul>
          <li>
            <strong>Trigger:</strong> HTML (React) Element
          </li>
          <li>
            <strong>Content:</strong> HTML (React) Element
          </li>
          <li>
            <strong>placement:</strong> left
          </li>
          <li>
            <strong>placement:</strong> right
          </li>
          <li>
            <strong>placement:</strong> top
          </li>
          <li>
            <strong>placement:</strong> bottom
          </li>
        </ul>
      </div>

      <div className="box">
        <div className="grid">
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
            placement="top-end"
          >
            <InfoSpark />
          </Tooltip>
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
            placement="bottom-end"
          >
            <InfoSpark />
          </Tooltip>
        </div>

        <hr />
        <h4>Description:</h4>
        <p>An element that can be hovered, starting from multiple directions</p>
        <h4>Details:</h4>
        <ul>
          <li>
            <strong>placement:</strong> top-end
          </li>
          <li>
            <strong>placement:</strong> bottom-end
          </li>
        </ul>
      </div>

      <div className="box">
        <div className="grid">
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
            placement="top-start"
          >
            <InfoSpark />
          </Tooltip>
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
            placement="bottom-start"
          >
            <InfoSpark />
          </Tooltip>
        </div>

        <hr />
        <h4>Description:</h4>
        <p>An element that can be hovered, starting from multiple directions</p>
        <h4>Details:</h4>
        <ul>
          <li>
            <strong>placement:</strong> top-start
          </li>
          <li>
            <strong>placement:</strong> bottom-start
          </li>
        </ul>
      </div>



      <div className="box">
        <div className="grid">
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
            placement="left-end"
          >
            <InfoSpark />
          </Tooltip>
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
            placement="right-end"
          >
            <InfoSpark />
          </Tooltip>
        </div>

        <hr />
        <h4>Description:</h4>
        <p>An element that can be hovered, starting from multiple directions</p>
        <h4>Details:</h4>
        <ul>
          <li>
            <strong>placement:</strong> left-end
          </li>
          <li>
            <strong>placement:</strong> right-end
          </li>
        </ul>
      </div>




      <div className="box">
        <div className="grid">
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
            placement="left-start"
          >
            <InfoSpark />
          </Tooltip>
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
            placement="right-start"
          >
            <InfoSpark />
          </Tooltip>
        </div>

        <hr />
        <h4>Description:</h4>
        <p>An element that can be hovered, starting from multiple directions</p>
        <h4>Details:</h4>
        <ul>
          <li>
            <strong>placement:</strong> left-start
          </li>
          <li>
            <strong>placement:</strong> right-start
          </li>
        </ul>
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
          animationDuration={0}
          fadeDuration={0}
        >
          <p>No Animation</p>
        </Tooltip>
        <hr />
        <h4>Description:</h4>
        <p>A tooltip can be rendered inmediatly without delays</p>
        <h4>Details:</h4>
        <ul>
          <li>
            <strong>Trigger:</strong> HTML (React) Element
          </li>
          <li>
            <strong>Content:</strong> HTML (React) Element
          </li>
          <li>
            <strong>animationDuration:</strong> 0
          </li>
          <li>
            <strong>fadeDuration:</strong> 0
          </li>
        </ul>
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
          cursor={"url(/images/google-logo.svg), auto"}
        >
          <p>Hello world</p>
        </Tooltip>
        <hr />
        <h4>Description:</h4>
        <p>A custom image cursor can be used</p>
        <h4>Details:</h4>
        <ul>
          <li>
            <strong>Trigger:</strong> HTML (React) Element
          </li>
          <li>
            <strong>Content:</strong> HTML (React) Element
          </li>
          <li>
            <strong>cursor:</strong> url(/images/google-logo.svg), auto
          </li>
        </ul>
      </div>
    </div>
  );
};
