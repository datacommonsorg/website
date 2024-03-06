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
 * Search Box for the Biomedical DC landing page
 */

import React, { useEffect, useRef, useState } from "react";
import { Input, InputGroup } from "reactstrap";

interface BiomedicalSearchProps {
  // Whether to allow searching for an empty string
  allowEmptySearch?: boolean;
  // Function to run on search
  onSearch: (string) => void;
  // Placeholder query to show
  placeholderText?: string;
}

export function BiomedicalSearchBox(props: BiomedicalSearchProps): JSX.Element {
  const [invalid, setInvalid] = useState(false);
  const [value, setValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamically resize search box height to show entire query
  const setSearchBoxHeight = () => {
    inputRef.current.style.height = "inherit";
    inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
  };

  // Adjust search box height when window is resized
  useEffect(() => {
    window.addEventListener("resize", setSearchBoxHeight);
  });

  // Adjust search box height while query is being entered
  useEffect(() => {
    setSearchBoxHeight();
  }, [props.placeholderText, value]);

  return (
    <InputGroup className="search-bar-content">
      <div id="search-icon">
        <span className="material-icons-outlined">search</span>
      </div>
      <Input
        autoComplete="off"
        autoFocus={false}
        className="pac-target-input search-input"
        id="search-input"
        innerRef={inputRef}
        invalid={invalid}
        onChange={(e) => {
          setValue(e.target.value);
          setInvalid(false);
        }}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        placeholder={props.placeholderText}
        type="textarea"
        value={value}
      ></Input>
    </InputGroup>
  );

  function handleSearch(): void {
    if (!props.allowEmptySearch && !value) {
      setInvalid(true);
      return;
    }

    props.onSearch(value);
  }
}
