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
  count: number;
  onCountUpdated: (count: number) => void;
  label: string;
  disabled?: boolean;
}

export function ClaimCounter(props: ClaimCounterPropType): JSX.Element {
  return (
    <div className="claims-count">
      <button
        className="btn-count"
        onClick={() => props.onCountUpdated(props.count - 1)}
      >
        -
      </button>
      <span className="count-text">{props.count}</span>
      <button
        className="btn-count"
        onClick={() => props.onCountUpdated(props.count + 1)}
      >
        +
      </button>
      <p className="claim-text">{props.label}</p>
    </div>
  );
}
