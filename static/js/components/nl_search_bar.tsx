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
 * Component for a search bar that takes users to the NL interface on query
 * searched.
 */

import React, { createRef } from "react";
import { Input } from "reactstrap";

interface NlSearchBarPropType {
  inputId: string;
  placeholder: string;
}

export function NlSearchBar(props: NlSearchBarPropType): JSX.Element {
  const inputRef = createRef<HTMLInputElement>();

  return (
    <>
      <div className="search-icon-container">
        <span className="material-icons-outlined">search</span>
      </div>
      <Input
        id={props.inputId}
        innerRef={inputRef}
        placeholder={props.placeholder}
        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
      />
      <div className="search-button-container">
        <div className="search-button" onClick={handleSearch}>
          Search
        </div>
      </div>
    </>
  );

  function handleSearch(): void {
    const inputVal = inputRef.current ? inputRef.current.value : "";
    if (inputVal) {
      window.open(`/nl/#q=${encodeURI(inputVal)}&a=1`, "_self");
    }
  }
}
