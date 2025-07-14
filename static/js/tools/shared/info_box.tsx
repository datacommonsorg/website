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
/** @jsxImportSource @emotion/react */

/**
 * Box with info or instructions to display on tool landing pages
 */

import { css } from "@emotion/react";
import React from "react";

interface InfoBoxProps {
  children?: React.ReactNode;
  // material symbol icon name of the icon to show on top left of the box
  // if not provided, defaults to the "reminder" icon
  icon?: string;
}

export function InfoBox(props: InfoBoxProps): JSX.Element {
  return (
    <div>
      <div
        css={css`
          background-color: #c2e7ff33;
          border-radius: 16px;
          display: flex;
          flex-direction: row;
          gap: 16px;
          margin-bottom: 24px;
          padding: 20px 24px;

          .icon {
            font-size: 32px;
          }
        `}
      >
        <i
          className="material-symbols-outlined"
          css={css`
            font-size: 28px;
          `}
        >
          {props.icon || "reminder"}
        </i>
        <div
          css={css`
            color: var(--GM3-ref-neutral-neutral20, #303030);
            font-size: 22px;
            font-weight: 400;
            line-height: 28px;

            h2 {
              font-size: 24px;
              font-weight: 500;
              line-height: 28px;
            }
            ol,
            ul {
              margin: 24px 0;
            }
            li {
              margin: 24px 0;
            }
          `}
        >
          {props.children}
        </div>
      </div>
    </div>
  );
}
