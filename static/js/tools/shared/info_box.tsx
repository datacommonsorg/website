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

import { css, useTheme } from "@emotion/react";
import React, { ComponentType, ReactElement, SVGProps } from "react";

import { Reminder } from "../../components/elements/icons/reminder";
import { intl } from "../../i18n/i18n";
import { visualizationToolMessages } from "../../i18n/i18n_vis_tool_messages";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface InfoBoxProps {
  children?: React.ReactNode;
  heading?: React.ReactNode | string;
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
          display: flex;
          flex-direction: row;
          gap: ${theme.spacing.md}px;
          font-size: ${theme.infoBox.icon.size};
          background-color: ${theme.infoBox.backgroundColor};
          border-radius: ${theme.radius.secondary.borderRadius};
          padding: ${theme.spacing.lg}px;
        `}
      >
        {props.icon || (
          <Reminder fill={`${theme.colors.text.primary.base}`} fillAxisOn />
        )}
        <div
          css={css`
            display: flex;
            flex-direction: column;
            gap: ${theme.spacing.sm}px;
          `}
        >
          <div
            css={css`
              ${theme.infoBox.heading}
            `}
          >
            {props.heading}
          </div>
          <div
            css={css`
              color: ${theme.colors.text.primary.base};
              ${theme.typography.text.lg};
              ol,
              ul {
                margin: ${theme.spacing.lg}px 0;
              }
              li {
                margin: ${theme.spacing.lg}px 0;
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

/**
 * An instruction box for our map, scatter, and timeline tool to display
 * on their landing pages.
 */
interface VisToolInstructionsBoxProps {
  multiPlace?: boolean;
  multiVariable?: boolean;
}

export function VisToolInstructionsBox(
  props: VisToolInstructionsBoxProps
): JSX.Element {
  return (
    <InfoBox
      heading={intl.formatMessage(
        visualizationToolMessages.infoBoxInstructionHeader
      )}
    >
      <ol>
        <li>
          {props.multiPlace
            ? intl.formatMessage(
                visualizationToolMessages.infoBoxInstructionsPlaces
              )
            : intl.formatMessage(
                visualizationToolMessages.infoBoxInstructionsPlacesIn
              )}
        </li>
        <li>
          {props.multiVariable ? (
            <>
              <span className="d-none d-lg-inline">
                {intl.formatMessage(
                  visualizationToolMessages.infoBoxInstructionsMultiVariableDesktop
                )}
              </span>
              <span className="d-inline d-lg-none">
                {intl.formatMessage(
                  visualizationToolMessages.infoBoxInstructionsMultiVariableMobile
                )}
              </span>
            </>
          ) : (
            <>
              <span className="d-none d-lg-inline">
                {intl.formatMessage(
                  visualizationToolMessages.infoBoxInstructionsVariableDesktop
                )}
              </span>
              <span className="d-inline d-lg-none">
                {intl.formatMessage(
                  visualizationToolMessages.infoBoxInstructionsVariableMobile
                )}
              </span>
            </>
          )}
        </li>
      </ol>
    </InfoBox>
  );
}
