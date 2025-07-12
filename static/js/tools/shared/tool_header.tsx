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
 * Title component for the tools
 */

import { css } from "@emotion/react";
import React from "react";

import { intl, LocalizedLink } from "../../i18n/i18n";
import { visualizationToolMessages } from "../../i18n/i18n_vis_tool_messages";

interface ToolHeaderProps {
  title: string; // Name of the tool to use as a title
  subtitle?: string; // Text to show below the title
  switchToolsUrl?: string; // URL of an alternate version of the tool
}

export function ToolHeader(props: ToolHeaderProps): JSX.Element {
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 32px;
        width: 100%;
      `}
    >
      <div
        css={css`
          align-items: flex-end;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          width: 100%;
        `}
      >
        <h1
          css={css`
            margin-bottom: 0;
          `}
        >
          {props.title}
        </h1>
        {props.switchToolsUrl && (
          <LocalizedLink
            css={css`
              display: flex;
              align-items: center;
              font-size: 14px;
              height: fit-content;
              line-height: 21px;
              font-weight: 400;
              border: 1px solid #747775;
              border-radius: 100px;
              padding: 8px 16px;
              text-decoration: none;

              :hover {
                outline: 1px solid var(--dc-primary);
                border-color: var(--dc-primary);
              }
            `}
            href={props.switchToolsUrl}
            text={intl.formatMessage(
              visualizationToolMessages.switchToolVersion
            )}
          ></LocalizedLink>
        )}
      </div>
      {props.subtitle && (
        <div
          css={css`
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
          `}
        >
          {props.subtitle}
        </div>
      )}
    </div>
  );
}
