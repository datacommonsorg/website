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

import _ from "lodash";
import React, { useState } from "react";
import { FormGroup, Input, Label } from "reactstrap";

import { intl } from "../../i18n/i18n";
import { tileMessages } from "../../i18n/i18n_tile_messages";
import {
  FacetSelector,
  FacetSelectorFacetInfo,
} from "../../shared/facet_selector";
import {
  GA_EVENT_TOOL_CHART_OPTION_CLICK,
  GA_PARAM_TOOL_CHART_OPTION,
  GA_VALUE_TOOL_CHART_OPTION_EDIT_SOURCES,
  GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
  triggerGAEvent,
} from "../../shared/ga_events";
import { urlToDisplayText } from "../../shared/util";

interface ToolChartFooterPropType {
  // Id of the chart this footer is being added to.
  chartId: string;
  // Sources the chart got its data from.
  sources: Set<string>;
  // Measurement methods of the data of the chart.
  mMethods: Set<string>;
  // Map of stat var to facet id of the selected source for that variable.
  svFacetId: Record<string, string>;
  // Source selector information for a list of stat vars.
  facetList: FacetSelectorFacetInfo[];
  // callback when mapping of stat var dcid to facet id is updated.
  onSvFacetIdUpdated: (svFacetId: Record<string, string>) => void;
  // Whether to hide isRatio option.
  hideIsRatio: boolean;
  // Whether or not the chart is showing per capita calculation.
  isPerCapita?: boolean;
  // Callback when isRatio is updated. Used when hideIsRatio is false.
  onIsPerCapitaUpdated?: (isPerCapita: boolean) => void;
  // children components
  children?: React.ReactNode;
}

const DOWN_ARROW_HTML = <i className="material-icons">expand_more</i>;
const UP_ARROW_HTML = <i className="material-icons">expand_less</i>;
const SELECTOR_PREFIX = "chart-footer";
const FEEDBACK_LINK = "/feedback";

export function ToolChartFooter(props: ToolChartFooterPropType): JSX.Element {
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
      >
        <div className={`${SELECTOR_PREFIX}-metadata-section`}>
          {!_.isEmpty(props.sources) && (
            <div className={`${SELECTOR_PREFIX}-metadata`}>
              <span>Data from {getSourcesJsx(props.sources)}</span>
              {globalThis.viaGoogle
                ? " " + intl.formatMessage(tileMessages.viaGoogle)
                : ""}
            </div>
          )}
          {!_.isEmpty(mMethods) && (
            <div className={`${SELECTOR_PREFIX}-metadata`}>
              <span>{`Measurement method${
                props.mMethods.size > 1 ? "s" : ""
              }: ${mMethods}`}</span>
            </div>
          )}
        </div>
        <div
          onClick={(): void => setChartOptionsOpened(!chartOptionsOpened)}
          className={`${SELECTOR_PREFIX}-options-button`}
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
                  Per Capita
                </Label>
              </FormGroup>
            </span>
          )}
          {props.children}
          <FacetSelector
            svFacetId={props.svFacetId}
            facetListPromise={Promise.resolve(props.facetList)}
            onSvFacetIdUpdated={(svFacetId): void => {
              props.onSvFacetIdUpdated(svFacetId);
              triggerGAEvent(GA_EVENT_TOOL_CHART_OPTION_CLICK, {
                [GA_PARAM_TOOL_CHART_OPTION]:
                  GA_VALUE_TOOL_CHART_OPTION_EDIT_SOURCES,
              });
            }}
          />
        </div>
      )}
      <div className="feedback-link">
        <a href={FEEDBACK_LINK}>Feedback</a>
      </div>
    </>
  );
}

function getSourcesJsx(sources: Set<string>): JSX.Element[] {
  const sourceList: string[] = Array.from(sources);
  const seenSourceText = new Set();
  const sourcesJsx = sourceList.map((source, index) => {
    const sourceText = urlToDisplayText(source);
    if (seenSourceText.has(sourceText)) {
      return null;
    }
    seenSourceText.add(sourceText);
    // handle relative url that doesn't contain https or http or www
    const processedUrl = sourceText === source ? "https://" + source : source;
    return (
      <span key={source}>
        {index > 0 ? ", " : ""}
        <a href={processedUrl}>{sourceText}</a>
      </span>
    );
  });
  return sourcesJsx;
}
