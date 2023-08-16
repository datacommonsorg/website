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

import React, { useEffect, useState } from "react";
import { Button, Input, InputGroup } from "reactstrap";

interface TextSearchBarPropType {
  allowEmptySearch?: boolean;
  inputId: string;
  onSearch: (q: string) => void;
  initialValue: string;
  placeholder: string;
  shouldAutoFocus?: boolean;
  clearValueOnSearch?: boolean;
}

/**
 * Component for the search box in the rich search interface. The value of the
 * is not controlled to prevent constantly updating the hash URL.
 */
export function TextSearchBar(props: TextSearchBarPropType): JSX.Element {
  const [invalid, setInvalid] = useState(false);
  const [value, setValue] = useState<string>("");
  useEffect(() => {
    setValue(props.initialValue);
    setInvalid(false);
  }, [props.initialValue]);
  return (
    <div className="search-bar">
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
        <div onClick={handleSearch} id="rich-search-button">
          <img src="/images/search-button-icon.svg" alt="Search" />
        </div>
      </InputGroup>
    </div>
  );

  function handleSearch(): void {
    if (!props.allowEmptySearch && !value) {
      setInvalid(true);
      return;
    }

    props.onSearch(value);
    if (props.clearValueOnSearch) {
      setValue("");
    }
  }
}
