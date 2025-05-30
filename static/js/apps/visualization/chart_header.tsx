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
 * Chart header used for Vis tool charts
 *
 * This contains options such as the per-capita selector, as well as
 * the facet selector button.
 */

/** @jsxImportSource @emotion/react */

import { css, Theme, useTheme } from "@emotion/react";
import React, { ReactElement, useMemo } from "react";
import { Input } from "reactstrap";

import {
  GA_EVENT_TOOL_CHART_OPTION_CLICK,
  GA_PARAM_TOOL_CHART_OPTION,
  triggerGAEvent,
} from "../../shared/ga_events";

export interface InputInfo {
  isChecked: boolean;
  onUpdated: (isChecked: boolean) => void;
  label: string;
  gaEventParam?: string;
}

interface ChartHeaderProps {
  inputSections: { label?: string; inputs: InputInfo[] }[];
  facetSelector: React.ReactNode;
}

export function ChartHeader(props: ChartHeaderProps): ReactElement {
  const theme = useTheme();

  const sections = useMemo(
    () =>
      props.inputSections.filter(
        (section) => Array.isArray(section.inputs) && section.inputs.length > 0
      ),
    [props.inputSections]
  );

  return (
    <header
      css={css`
        display: flex;
        justify-content: space-between;
        padding: ${theme.spacing.md}px;
        gap: ${theme.spacing.xl}px;
        align-items: center;
        border-bottom: 1px solid ${theme.colors.box.tooltip.pill};
        @media (max-width: ${theme.breakpoints.lg}px) {
          flex-wrap: wrap;
        }
        @media (max-width: ${theme.breakpoints.md}px) {
          align-items: flex-start;
          flex-direction: column;
        }
      `}
    >
      {props.facetSelector}
      <div
        css={css`
          display: flex;
          flex-shrink: 3;
          flex-wrap: wrap;
          gap: ${theme.spacing.md}px;
          align-items: center;
        `}
      >
        {sections.map((inputSection, sectionIdx) => {
          return (
            <div
              key={`section-${sectionIdx}`}
              // css={css`
              //   display: flex;
              //   flex-wrap: wrap;
              //   flex-shrink: 3;
              //   align-items: center;
              //   padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
              //   gap: ${theme.spacing.sm}px;
              //   background: ${theme.colors.box.tooltip.pill};
              //   ${theme.typography.family.text}
              //   ${theme.typography.text.sm}
              //   @media (max-width: ${theme.breakpoints.sm}px) {
              //     flex-basis: 100%;
              //   }
              // `}
              css={css`
                display: flex;
                flex-wrap: wrap;
                flex-shrink: 3;
                align-items: center;
                gap: ${theme.spacing.sm}px;
                ${theme.typography.family.text}
                ${theme.typography.text.sm}
                padding: 0 ${theme.spacing.md}px 0 0;
                border-right: 1px solid ${theme.colors.border.primary.light};
                &:last-of-type {
                  border: none;
                }
                @media (max-width: ${theme.breakpoints.sm}px) {
                  padding: 0 0 ${theme.spacing.md}px 0;
                  border-right: 0;
                  flex-basis: 100%;
                  border-bottom: 1px solid ${theme.colors.border.primary.light};
                }
              `}
            >
              {inputSection.label && (
                <p
                  css={css`
                    margin: 0;
                    font-weight: 900;
                  `}
                >
                  {inputSection.label}
                </p>
              )}
              <div
                className="option-inputs"
                css={css`
                  display: flex;
                  gap: ${theme.spacing.md}px;
                  align-items: center;
                  flex-shrink: 3;
                  flex-wrap: wrap;
                `}
              >
                {inputSection.inputs.map((input, inputIdx) => {
                  return (
                    <label
                      aria-label={`Toggle ${input.label}`}
                      key={`section-${sectionIdx}-input-${inputIdx}`}
                      css={css`
                        display: flex;
                        align-items: center;
                        gap: ${theme.spacing.xs}px;
                        flex-shrink: 3;
                        flex-wrap: wrap;
                        margin: 0;
                        padding: 0;
                        && {
                          input {
                            position: inherit;
                            margin: 0;
                            padding: 0;
                          }
                        }
                      `}
                    >
                      <Input
                        type="checkbox"
                        checked={input.isChecked}
                        onChange={(): void => {
                          input.onUpdated(!input.isChecked);
                          if (!input.isChecked && input.gaEventParam) {
                            triggerGAEvent(GA_EVENT_TOOL_CHART_OPTION_CLICK, {
                              [GA_PARAM_TOOL_CHART_OPTION]: input.gaEventParam,
                            });
                          }
                        }}
                      />
                      {input.label}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </header>
  );
}
