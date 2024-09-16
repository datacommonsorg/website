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
 * Inline-header version of the NL Search Component - used in Version 2 of the header
 */

import React, { ReactElement } from "react";
import { Input, InputGroup } from "reactstrap";

import { NlSearchBarImplementationProps } from "../nl_search_bar";

const NlSearchBarHeaderInline = ({
  value,
  invalid,
  placeholder,
  inputId,
  onChange,
  onSearch,
  shouldAutoFocus,
}: NlSearchBarImplementationProps): ReactElement => {
  return (
    <div className="header-search-section">
      <div className="search-box-section">
        <div className={`search-bar${value ? " non-empty" : ""}`}>
          <InputGroup className="search-bar-content">
            <span className="material-icons-outlined">search</span>
            <Input
              id={inputId}
              invalid={invalid}
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              onKeyDown={(e): void => e.key === "Enter" && onSearch()}
              className="pac-target-input search-input-text"
              autoFocus={shouldAutoFocus}
              autoComplete="off"
            ></Input>
            <div onClick={onSearch} id="rich-search-button">
              <span className="material-icons-outlined">arrow_forward</span>
            </div>
          </InputGroup>
        </div>
      </div>
    </div>
  );
};

export default NlSearchBarHeaderInline;
