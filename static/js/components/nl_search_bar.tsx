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
 * Component for the search bar used for all NL queries.
 */

import React, { useEffect, useState } from "react";
import { Input, InputGroup } from "reactstrap";

interface NlSearchBarPropType {
  allowEmptySearch?: boolean;
  inputId: string;
  onSearch: (q: string) => void;
  initialValue: string;
  placeholder: string;
  shouldAutoFocus?: boolean;
  feedbackLink?: string;
}

export function NlSearchBar(props: NlSearchBarPropType): JSX.Element {
  const [invalid, setInvalid] = useState(false);
  const [value, setValue] = useState<string>("");
  useEffect(() => {
    setValue(props.initialValue);
    setInvalid(false);
  }, [props.initialValue]);

  return (
    <div className="search-section">
      <div className="search-bar-tags">
        <div className="early-preview-tag">Early preview</div>
        {props.feedbackLink && (
          <>
            <span>|</span>
            <div className="feedback-link">
              <a href={props.feedbackLink} target="_blank" rel="noreferrer">
                Feedback
              </a>
            </div>
          </>
        )}
      </div>
      <div className="search-box-section">
        <div className={`search-bar${value ? " non-empty" : ""}`}>
          <InputGroup className="search-bar-content">
            <Input
              id={props.inputId}
              invalid={invalid}
              placeholder={props.placeholder}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setInvalid(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pac-target-input search-input-text"
              autoFocus={props.shouldAutoFocus}
              autoComplete="off"
            ></Input>
            <div onClick={handleSearch} id="rich-search-button"></div>
          </InputGroup>
        </div>
      </div>
    </div>
  );

  function handleSearch(): void {
    if (!props.allowEmptySearch && !value) {
      setInvalid(true);
      return;
    }

    props.onSearch(value);
  }
}
