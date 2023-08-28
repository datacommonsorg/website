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
 * Chart Footer used for Vis tool charts
 */

import React from "react";
import { FormGroup, Input, Label } from "reactstrap";

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

interface ChartFooterPropType {
  inputSections: { label?: string; inputs: InputInfo[] }[];
}

export function ChartFooter(props: ChartFooterPropType): JSX.Element {
  return (
    <div className="chart-footer-options">
      {props.inputSections.map((inputSection, sectionIdx) => {
        return (
          <div className="option-section" key={`section-${sectionIdx}`}>
            {inputSection.label && (
              <span className="option-label">{inputSection.label}</span>
            )}
            <div className="option-inputs">
              {inputSection.inputs.map((input, inputIdx) => {
                return (
                  <div
                    className="chart-option"
                    key={`section-${sectionIdx}-input-${inputIdx}`}
                  >
                    <Input
                      type="checkbox"
                      checked={input.isChecked}
                      onChange={() => {
                        input.onUpdated(!input.isChecked);
                        if (!input.isChecked && input.gaEventParam) {
                          triggerGAEvent(GA_EVENT_TOOL_CHART_OPTION_CLICK, {
                            [GA_PARAM_TOOL_CHART_OPTION]: input.gaEventParam,
                          });
                        }
                      }}
                    />
                    <span>{input.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
