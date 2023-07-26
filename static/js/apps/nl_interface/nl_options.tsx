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
 * Options for NL.
 */

import React from "react";
import { FormGroup, Input, Label } from "reactstrap";

import { NL_DETECTOR_VALS } from "../../constants/app/nl_interface_constants";
import { useStoreActions, useStoreState } from "./app_state";

export function NLOptions(): JSX.Element {
  const detector = useStoreState((s) => s.config.detector);
  const updateConfig = useStoreActions((a) => a.updateConfig);

  return (
    <div className="nl-options-row">
      <div className="nl-options-label">Detection:</div>
      <div className="nl-options-input-radio">
        <FormGroup>
          <Label>
            <Input
              checked={detector === NL_DETECTOR_VALS.HEURISTIC}
              id="nl-heuristics"
              type="radio"
              value={0}
              onChange={() => {
                updateConfig({ detector: NL_DETECTOR_VALS.HEURISTIC });
              }}
            />
            Heuristic
          </Label>
          <Label>
            <Input
              checked={detector === NL_DETECTOR_VALS.LLM}
              id="nl-llm"
              type="radio"
              value={1}
              onChange={() => {
                updateConfig({ detector: NL_DETECTOR_VALS.LLM });
              }}
            />
            LLM
          </Label>
          <Label>
            <Input
              checked={detector === NL_DETECTOR_VALS.HYBRID}
              id="nl-hybrid"
              type="radio"
              value={2}
              onChange={() => {
                updateConfig({ detector: NL_DETECTOR_VALS.HYBRID });
              }}
            />
            Hybrid
          </Label>
        </FormGroup>
      </div>
    </div>
  );
}
