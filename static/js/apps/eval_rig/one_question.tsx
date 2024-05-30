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

/**
 * Component for rendering one question (with radio buttons)
 */

import React, { ChangeEvent } from "react";

interface OneQuestionProps {
  name: string;
  question: string;
  options: Record<string, string>; // Map from ENUM to displayed string
  handleChange: (event: ChangeEvent) => void;
  responseField: string;
}

export function OneQuestion(props: OneQuestionProps): JSX.Element {
  return (
    <div>
      <h3>{props.question}</h3>
      {Object.keys(props.options).map((key) => {
        const value = props.options[key];
        return (
          <label key={key}>
            <input
              type="radio"
              name={props.name}
              value={key}
              checked={props.responseField === key}
              onChange={props.handleChange}
            />
            {value}
          </label>
        );
      })}
    </div>
  );
}
