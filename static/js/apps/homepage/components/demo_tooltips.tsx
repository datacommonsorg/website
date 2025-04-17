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
        @media (max-width: ${theme.breakpoints.md}px) {
          grid-template-columns: 1fr;
        }
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
      <div
        className="box"
        css={css`
          ${theme.typography.family.text}
          ${theme.typography.text.sm}
        `}
      >
        A simple{" "}
        <Tooltip title="A simple tooltip, text trigger, text content" showArrow>
          text trigger
        </Tooltip>
        .
        <hr />
        <h4>Description:</h4>
        <p>
          A simple tooltip with an string of text as trigger, with the arrow
          flag set.
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
          cursor={"default"}
        >
          <p>
            A cursor that follow the cursor, that can be used with long
            elements.
          </p>
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
              <h2>A tooltip with HTML content</h2>
              <p>
                <em>This cursor is to the left.</em>
              </p>
              <p>
                <a href={"https://google.com"}>
                  A link the user can interact with.
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
              <p>This is always a popover</p>
              <p>
                <a href={"https://google.com"}>
                  A link the user can interact with.
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
          A popover dialog activated by clicking, with close icon, closes on
          click outside or using with the ESC key.
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
        <p>
          <Tooltip
            title={
              <>
                <h2>A tooltip with HTML content</h2>
                <p>
                  <a href={"https://google.com"}>
                    A link the user can interact with.
                  </a>
                </p>
              </>
            }
            placement="left"
          >
            <span>Tooltip appearing on the Left</span>
          </Tooltip>
        </p>
        <p>
          <Tooltip
            title={
              <>
                <h2>A tooltip with HTML content</h2>
                <p>
                  <a href={"https://google.com"}>
                    A link the user can interact with.
                  </a>
                </p>
              </>
            }
            placement="right"
          >
            <span>Tooltip appearing on the Right</span>
          </Tooltip>
        </p>
        <p>
          <Tooltip
            title={
              <>
                <h2>A tooltip with HTML content</h2>
                <p>
                  <a href={"https://google.com"}>
                    A link the user can interact with.
                  </a>
                </p>
              </>
            }
            placement="top"
          >
            <span>Tooltip appearing on the Top</span>
          </Tooltip>
        </p>
        <p>
          <Tooltip
            title={
              <>
                <h2>A tooltip with HTML content</h2>
                <p>
                  <a href={"https://google.com"}>
                    A link the user can interact with.
                  </a>
                </p>
              </>
            }
            placement="bottom"
          >
            <span>Tooltip appearing on the Bottom</span>
          </Tooltip>
        </p>
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
                <h2>A tooltip with HTML content</h2>
                <p>
                  <a href={"https://google.com"}>
                    A link the user can interact with.
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
                <h2>A tooltip with HTML content</h2>
                <p>
                  <a href={"https://google.com"}>
                    A link the user can interact with.
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
        <p>A tooltip with placements.</p>
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
                <h2>A tooltip with HTML content</h2>
                <p>
                  <a href={"https://google.com"}>
                    A link the user can interact with.
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
                <h2>A tooltip with HTML content</h2>
                <p>
                  <a href={"https://google.com"}>
                    A link the user can interact with.
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
        <p>A tooltip with placements.</p>
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
                <h2>A tooltip with HTML content</h2>
                <p>
                  <a href={"https://google.com"}>
                    A link the user can interact with.
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
                <h2>A tooltip with HTML content</h2>
                <p>
                  <a href={"https://google.com"}>
                    A link the user can interact with.
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
                <h2>A tooltip with HTML content</h2>
                <p>
                  <a href={"https://google.com"}>
                    A link the user can interact with.
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
                <h2>A tooltip with HTML content</h2>
                <p>
                  <a href={"https://google.com"}>
                    A link the user can interact with.
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
          title={"A simple tooltip with no animation (no fade, no pop effect)."}
          animationDuration={0}
          fadeDuration={0}
        >
          <p>No Animation</p>
        </Tooltip>
        <hr />
        <h4>Description:</h4>
        <p>A tooltip can be rendered with no animation.</p>
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
              <p>This tooltip has a custom cursor.</p>
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

      <div
        className="box"
        css={css`
          ${theme.typography.family.text}
          ${theme.typography.text.sm}
        `}
      >
        You can apply arbitrary{" "}
        <Tooltip
          title={
            <>
              <h2>A tooltip with HTML content</h2>
              <p>
                <a href={"https://google.com"}>
                  A link the user can interact with.
                </a>
              </p>
            </>
          }
          sx={css`
            background-color: #000;
            color: #fff;
            a {
              color: hsl(204, 90%, 80%);
            }
            .tooltip-close {
              color: white;
            }
          `}
        >
          tooltip styles
        </Tooltip>
        .
        <hr />
        <h4>Description:</h4>
        <p>
          Arbitrary styles passed into the component to style the tooltip. Note
          that styles to the content itself (the text in this case) could also
          be applied as Emotion directly to the tooltip content inside the title
          prop.
        </p>
        <h4>Details:</h4>
        <ul>
          <li>
            <strong>Trigger:</strong> HTML (React) Element
          </li>
          <li>
            <strong>Content:</strong> Test string Element
          </li>
          <li>
            <strong>sx:</strong>&#9001;css to style tooltip&#12297;
          </li>
        </ul>
      </div>
    </div>
  );
};
