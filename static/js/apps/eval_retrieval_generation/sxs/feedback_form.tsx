/*
 Copyright 2024 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/* Component that lets a rater enter which answer they prefer and why. */

import React, { FormEvent } from "react";

import { SxsPreference } from "./types";

const PREFERENCE_INPUT_NAME = "preference";
const REASON_INPUT_NAME = "reason";

// Map from enum to displayed string
const OPTIONS: Record<string, string> = {
  [SxsPreference.LEFT]: "Left",
  [SxsPreference.RIGHT]: "Right",
  [SxsPreference.NEUTRAL]: "No preference",
};

interface FeedbackFormProps {
  disabled: boolean;
  preference: SxsPreference | null;
  reason: string;
  setPreference: (value: SxsPreference) => void;
  setReason: (value: string) => void;
}

export function FeedbackForm(props: FeedbackFormProps): JSX.Element {
  const handleChange = (event: FormEvent<HTMLInputElement>) => {
    const { name, value } = event.target as HTMLInputElement;
    if (name === PREFERENCE_INPUT_NAME) {
      props.setPreference(value as SxsPreference);
    }
    if (name === REASON_INPUT_NAME) {
      props.setReason(value ?? "");
    }
  };

  return (
    <div className="one-question">
      <div className="question">Which answer do you prefer?</div>
      <div className="options">
        {Object.keys(OPTIONS).map((optionKey) => {
          const optionValue = OPTIONS[optionKey];
          return (
            <label key={optionKey}>
              <input
                type="radio"
                name={PREFERENCE_INPUT_NAME}
                value={optionKey}
                checked={props.preference === optionKey}
                onChange={handleChange}
                disabled={props.disabled}
              />
              {optionValue}
            </label>
          );
        })}
      </div>
      <div className="question">Why?</div>
      <div className="freeText">
        <input
          name={REASON_INPUT_NAME}
          value={props.reason}
          onChange={handleChange}
          disabled={props.disabled}
        />
      </div>
    </div>
  );
}
