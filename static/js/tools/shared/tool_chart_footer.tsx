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

import { DENOM_INPUT_PLACEHOLDER } from "../../shared/constants";
import {
  SourceSelector,
  SourceSelectorSvInfo,
} from "../../shared/source_selector";
import { urlToDomain } from "../../shared/util";

interface ToolChartFooterPropType {
  // Id of the chart this footer is being added to.
  chartId: string;
  // Sources the chart got its data from.
  sources: Set<string>;
  // Measurement methods of the data of the chart.
  mMethods: Set<string>;
  // Source selector information for a list of stat vars.
  sourceSelectorSvInfoList: SourceSelectorSvInfo[];
  // callback when mapping of stat var dcid to methash is updated.
  onSvMetahashUpdated: (svMetahashMap: Record<string, string>) => void;
  // Whether to hide isRatio option.
  hideIsRatio: boolean;
  // Whether or not the chart is showing ratio calculation. Used when
  // hideIsRatio is false.
  isRatio?: boolean;
  // Callback when isRatio is updated. Used when hideIsRatio is false.
  onIsRatioUpdated?: (isRatio: boolean) => void;
  // The denominator used to calculate ratio. Used when hideIsRatio is false.
  denom?: string;
  // Callback when denom is updated. Used when hideIsRatio is false.
  onDenomUpdated?: (denom: string) => void;
  // children components
  children?: React.ReactNode;
  // Whether the chart options section should start opened
  optionsOpened?: boolean;
}

const DOWN_ARROW_HTML = <i className="material-icons">expand_more</i>;
const UP_ARROW_HTML = <i className="material-icons">expand_less</i>;
const SELECTOR_PREFIX = "chart-footer";

export function ToolChartFooter(props: ToolChartFooterPropType): JSX.Element {
  const mMethods = !_.isEmpty(props.mMethods)
    ? Array.from(props.mMethods).join(", ")
    : "";
  const ratioCheckboxId = props.chartId + "-ratio";
  const [chartOptionsOpened, setChartOptionsOpened] = useState(
    props.optionsOpened
  );
  const [denomInput, setDenomInput] = useState(props.denom);

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
          onClick={() => setChartOptionsOpened(!chartOptionsOpened)}
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
                    checked={props.isRatio}
                    onChange={() => props.onIsRatioUpdated(!props.isRatio)}
                  />
                  Ratio of
                </Label>
                <input
                  className="denom-input"
                  disabled={!props.isRatio}
                  placeholder={DENOM_INPUT_PLACEHOLDER}
                  onBlur={() => props.onDenomUpdated(denomInput)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      props.onDenomUpdated(denomInput);
                    }
                  }}
                  value={denomInput}
                  onChange={(e) => setDenomInput(e.target.value)}
                />
              </FormGroup>
            </span>
          )}
          {props.children}
          <SourceSelector
            svInfoList={props.sourceSelectorSvInfoList}
            onSvMetahashUpdated={props.onSvMetahashUpdated}
          />
        </div>
      )}
    </>
  );
}

function getSourcesJsx(sources: Set<string>): JSX.Element[] {
  const sourceList: string[] = Array.from(sources);
  const seenSourceDomains = new Set();
  const sourcesJsx = sourceList.map((source, index) => {
    const domain = urlToDomain(source);
    if (seenSourceDomains.has(domain)) {
      return null;
    }
    seenSourceDomains.add(domain);
    return (
      <span key={source}>
        {index > 0 ? ", " : ""}
        <a href={source}>{domain}</a>
      </span>
    );
  });
  return sourcesJsx;
}
