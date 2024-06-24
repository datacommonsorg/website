/**
 * Copyright 2024 Google LLC
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

/* Component to count the number of claims */

import _ from "lodash";
import React from "react";

interface ClaimCounterPropType {
  claimsCount: number;
  setClaimsCount: (count: number) => void;
  falseClaimsCount: number;
  setFalseClaimsCount: (count: number) => void;
  disabled: boolean;
}

export function ClaimCounter(props: ClaimCounterPropType): JSX.Element {
  return (
    <div className="block-evaluation question-section">
      <div className="title">BLOCK EVALUATION</div>
      <div className="subtitle">
        Count the number of claims (statistical or logical) made by the model.
      </div>
      <div className={`counter${props.disabled ? " disabled" : ""}`}>
        <div className="claims-count">
          <button
            className="btn-count"
            onClick={() =>
              props.disabled
                ? _.noop()
                : props.setClaimsCount(props.claimsCount - 1)
            }
          >
            -
          </button>
          <span className="count-text">{props.claimsCount}</span>
          <button
            className="btn-count"
            onClick={() =>
              props.disabled
                ? _.noop()
                : props.setClaimsCount(props.claimsCount + 1)
            }
          >
            +
          </button>
          <p className="claim-text">Number of claims found</p>
        </div>
        <div className="false-claims-count">
          <button
            className="btn-count"
            onClick={() =>
              props.disabled
                ? _.noop()
                : props.setFalseClaimsCount(props.falseClaimsCount - 1)
            }
          >
            -
          </button>
          <span className="count-text">{props.falseClaimsCount}</span>
          <button
            className="btn-count"
            onClick={() =>
              props.disabled
                ? _.noop()
                : props.setFalseClaimsCount(props.falseClaimsCount + 1)
            }
          >
            +
          </button>
          <p className="claim-text">False claims found</p>
        </div>
      </div>
    </div>
  );
}
