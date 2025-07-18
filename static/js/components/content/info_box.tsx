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
 * Box with icon and info or instructions to display
 */

import { css, useTheme } from "@emotion/react";
import React, { ComponentType, ReactElement, SVGProps } from "react";

import { Reminder } from "../../components/elements/icons/reminder";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface InfoBoxProps {
  children?: React.ReactNode;
  heading?: React.ReactNode;
  // icon component to show on top left of the box
  // if not provided, defaults to the "reminder" icon
  icon?: ReactElement<IconComponent>;
}

export function InfoBox(props: InfoBoxProps): JSX.Element {
  const theme = useTheme();
  return (
    <div
      css={css`
        width: 100%;
      `}
    >
      <div
        css={css`
          background-color: ${theme.infoBox.backgroundColor};
          border-radius: ${theme.radius.secondary.borderRadius};
          display: flex;
          flex-direction: row;
          gap: ${theme.spacing.md}px;
          padding: ${theme.spacing.lg}px;
          ${theme.infoBox.icon}

          & > svg {
            flex-shrink: 0;
          }
        `}
      >
        {props.icon || (
          <Reminder fill={theme.colors.text.primary.base} fillAxisOn />
        )}
        <div
          css={css`
            display: flex;
            flex-direction: column;
            gap: ${theme.spacing.md}px;
          `}
        >
          {props.heading && (
            <div
              css={css`
                ${theme.infoBox.heading}
              `}
            >
              {props.heading}
            </div>
          )}
          <div
            css={css`
              color: ${theme.colors.text.primary.base};
              ${theme.typography.text.lg};
              ol,
              ul {
                display: flex;
                flex-direction: column;
                gap: ${theme.spacing.lg}px;
                margin: 0;
              }
            `}
          >
            {props.children}
          </div>
        </div>
      </div>
    </div>
  );
}
