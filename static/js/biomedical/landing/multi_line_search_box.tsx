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
 * Search box for the Biomedical DC landing page
 */

import React, { useEffect, useRef, useState } from "react";
import { Input, InputGroup } from "reactstrap";
import { styled } from "styled-components";

import { BREAKPOINTS } from "./constants";

const SearchIcon = styled.div`
  align-items: center;
  cursor: pointer;
  display: flex;
  margin-left: 4px;
  padding: 8px;
`;

const StyledInputGroup = styled(InputGroup)`
  background-color: white;
  border-radius: 28px;
  border: 1px solid #303030;
  display: flex;
  margin: 48px 0px 100px 0px;
  padding: 8px 0px;

  @media ${BREAKPOINTS.md} {
    margin: 22px 0px 48px 0px;
  }

  &:focus-within {
    outline: 3px solid ${(props): string => props.theme.highlightColors.main};
  }
`;

const StyledInput = styled(Input)`
  border: none;
  color: ${(props): string => props.theme.header.textColorLight};
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  margin-right: 20px;
  overflow: hidden;
  resize: none;

  @media ${BREAKPOINTS.md} {
    font-size: 14px;
    font-weight: 400;
    line-height: 18px;
  }

  &:focus {
    box-shadow: none !important;
  }
`;

interface MultiLineSearchBoxProps {
  // Function to run on search
  onSearch: (query: string) => void;
  // Placeholder query to show
  placeholderText?: string;
}

export function MultiLineSearchBox(
  props: MultiLineSearchBoxProps
): JSX.Element {
  const [value, setValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamically resize search box height to show entire query
  const setSearchBoxHeight = (): void => {
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
    <StyledInputGroup>
      <SearchIcon onClick={handleSearch}>
        <span className="material-icons-outlined">search</span>
      </SearchIcon>
      <StyledInput
        autoComplete="off"
        autoFocus={false}
        innerRef={inputRef}
        invalid={false}
        onChange={(e): void => {
          setValue(e.target.value);
        }}
        onKeyDown={(e): void => {
          if (e.key === "Enter") {
            e.preventDefault(); // don't add \n to search query
            handleSearch();
          }
        }}
        placeholder={props.placeholderText}
        type="textarea"
        value={value}
      ></StyledInput>
    </StyledInputGroup>
  );

  function handleSearch(): void {
    if (!value) {
      // disallow searching for an empty string
      return;
    }

    props.onSearch(value);
  }
}
