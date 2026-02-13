/**
 * Copyright 2022 Google LLC
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
 * Footer for charts created by the different tools
 */
/** @jsxImportSource @emotion/react */
import { StatVarSpec } from "@datacommonsorg/client/dist/data_commons_web_client_types";
import { css, useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import _ from "lodash";
import React, { ReactElement, RefObject, useState } from "react";
import { FormGroup, Input, Label } from "reactstrap";

import { ApiButton } from "../../../components/tiles/components/api_button";
import { intl } from "../../../i18n/i18n";
import { chartComponentMessages } from "../../../i18n/i18n_chart_messages";
import { messages } from "../../../i18n/i18n_messages";
import { WEBSITE_SURFACE } from "../../../shared/constants";
import {
  GA_EVENT_TOOL_CHART_OPTION_CLICK,
  GA_PARAM_TOOL_CHART_OPTION,
  GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
  triggerGAEvent,
} from "../../../shared/ga_events";
import { ObservationSpec } from "../../../shared/observation_specs";
import { StatMetadata } from "../../../shared/stat_types";
import { StatVarFacetMap } from "../../../shared/types";
import { FontFamily, TextVariant } from "../../../theme/types";
import { TileSources } from "../metadata/tile_sources";

interface ToolChartFooterProps {
  // Id of the chart this footer is being added to.
  chartId: string;
  // Sources the chart got its data from.
  sources: Set<string>;
  // Measurement methods of the data of the chart.
  mMethods: Set<string>;
  // Whether to hide isRatio option.
  hideIsRatio: boolean;
  // Whether or not the chart is showing per capita calculation.
  isPerCapita?: boolean;
  // Callback when isRatio is updated. Used when hideIsRatio is false.
  onIsPerCapitaUpdated?: (isPerCapita: boolean) => void;
  // children components
  children?: React.ReactNode;
  // a function passed through from the chart that handles the task
  // of creating the embedding used in the download functionality.
  handleEmbed?: () => void;
  // A callback function passed through from the chart that will collate
  // a set of observation specs relevant to the chart. These
  // specs can be hydrated into API calls.
  getObservationSpecs?: () => ObservationSpec[];
  // A ref to the chart container element.
  containerRef?: RefObject<HTMLElement>;
  // facets that make up the sources of the chart
  facets?: Record<string, StatMetadata>;
  // A mapping of which stat var used which facets
  statVarToFacets?: StatVarFacetMap;
  // A mapping of stat var dcids to their specific min and max date range from the chart
  statVarDateRanges?: Record<string, { minDate: string; maxDate: string }>;
  // the stat vars to link to in the metadata modal
  statVarSpecs?: StatVarSpec[];
}

const DOWN_ARROW_HTML = <i className="material-icons">expand_more</i>;
const UP_ARROW_HTML = <i className="material-icons">expand_less</i>;
const SELECTOR_PREFIX = "chart-footer";

const ChartFooterActionWrapper = styled.p`
  display: flex;
  align-items: center;
  gap: ${(props): number => props.theme.spacing.xs}px;
  margin: 0;
  padding: 0;
  ${(props): FontFamily => props.theme.typography.family.text}
  ${(props): TextVariant => props.theme.typography.text.xs}
  color: ${(props): string => props.theme.colors.link.primary.base};
  & > a {
    margin: 0;
    padding: 0;
  }
  & > .material-icons-outlined {
    ${(props): TextVariant => props.theme.typography.text.md}
    margin: 0;
    padding: 0;
  }
`;

const ChartFooterMetaDataWrapper = styled.p`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
  ${(props): FontFamily => props.theme.typography.family.text}
  ${(props): TextVariant => props.theme.typography.text.xs}
  line-height: 1.2rem;
  color: ${(props): string => props.theme.colors.text.tertiary.base};
  & > a {
    margin: 0;
    padding: 0;
    text-decoration: underline;
    color: ${(props): string => props.theme.colors.text.tertiary.base};
    &:hover {
      color: ${(props): string => props.theme.colors.link.primary.base};
    }
  }
`;

export function ToolChartFooter(props: ToolChartFooterProps): ReactElement {
  const theme = useTheme();

  const mMethods = !_.isEmpty(props.mMethods)
    ? Array.from(props.mMethods).join(", ")
    : "";
  const ratioCheckboxId = props.chartId + "-ratio";
  const [chartOptionsOpened, setChartOptionsOpened] = useState(true);

  return (
    <>
      <div
        className={`${SELECTOR_PREFIX}-container ${
          chartOptionsOpened ? "no-bottom-border" : ""
        }`}
        css={css`
          && {
            display: flex;
            @media (max-width: ${theme.breakpoints.sm}px) {
              flex-direction: column;
              align-items: stretch;
              justify-content: stretch;
              gap: ${theme.spacing.md}px;
            }
          }
        `}
      >
        <div
          className={`${SELECTOR_PREFIX}-metadata-section`}
          css={css`
            display: flex;
            align-items: center;
            gap: ${theme.spacing.xs}px ${theme.spacing.md}px;
            flex-wrap: wrap;
            @media (max-width: ${theme.breakpoints.sm}px) {
              border-bottom: 1px solid ${theme.colors.border.primary.light};
              padding-bottom: ${theme.spacing.md}px;
            }
          `}
        >
          {props.handleEmbed && (
            <ChartFooterActionWrapper>
              <span className="material-icons-outlined">download</span>
              <a
                href="#"
                onClick={(e): void => {
                  e.preventDefault();
                  props.handleEmbed();
                }}
              >
                {intl.formatMessage(messages.download)}
              </a>
            </ChartFooterActionWrapper>
          )}
          {props.getObservationSpecs && (
            <ChartFooterActionWrapper>
              <ApiButton
                getObservationSpecs={props.getObservationSpecs}
                containerRef={props.containerRef}
                surface={WEBSITE_SURFACE}
              />
            </ChartFooterActionWrapper>
          )}
          {!_.isEmpty(props.sources) && (
            <TileSources
              containerRef={props.containerRef}
              facets={props.facets}
              sources={props.sources}
              statVarDateRanges={props.statVarDateRanges}
              statVarSpecs={props.statVarSpecs}
              statVarToFacets={props.statVarToFacets}
              surface={WEBSITE_SURFACE}
            />
          )}
          {!_.isEmpty(mMethods) && (
            <ChartFooterMetaDataWrapper>
              {`Measurement method${
                props.mMethods.size > 1 ? "s" : ""
              }: ${mMethods}`}
            </ChartFooterMetaDataWrapper>
          )}
        </div>
        <div
          onClick={(): void => setChartOptionsOpened(!chartOptionsOpened)}
          className={`${SELECTOR_PREFIX}-options-button`}
          css={css`
            && {
              margin: 0;
              flex-shrink: 0;
            }
          `}
        >
          <span>Chart Options</span>
          {chartOptionsOpened ? UP_ARROW_HTML : DOWN_ARROW_HTML}
        </div>
      </div>
      {chartOptionsOpened && (
        <div className={`${SELECTOR_PREFIX}-options-section`}>
          {!props.hideIsRatio && (
            <span className="chart-option">
              <FormGroup check>
                <Label check>
                  <Input
                    id={ratioCheckboxId}
                    type="checkbox"
                    checked={props.isPerCapita}
                    onChange={(): void => {
                      props.onIsPerCapitaUpdated(!props.isPerCapita);
                      if (!props.isPerCapita) {
                        triggerGAEvent(GA_EVENT_TOOL_CHART_OPTION_CLICK, {
                          [GA_PARAM_TOOL_CHART_OPTION]:
                            GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
                        });
                      }
                    }}
                  />
                  {intl.formatMessage(chartComponentMessages.PerCapitaLabel)}
                </Label>
              </FormGroup>
            </span>
          )}
          {props.children}
        </div>
      )}
    </>
  );
}
