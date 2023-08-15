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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="42"
            height="42"
            viewBox="0 0 42 42"
            fill="none"
            className="search-button-svg"
          >
            <path
              d="M38.4992 21C38.4992 23.4208 38.0399 25.6958 37.1211 27.825C36.2024 29.9542 34.9555 31.8063 33.3805 33.3813C31.8055 34.9563 29.9534 36.2031 27.8242 37.1219C25.6951 38.0406 23.4201 38.5 20.9992 38.5C16.9159 38.5 13.2919 37.2385 10.1273 34.7156C6.96276 32.1927 4.89922 28.9333 3.93672 24.9375L6.73672 24.9375C7.61172 28.175 9.36901 30.8073 12.0086 32.8344C14.6482 34.8615 17.6451 35.875 20.9992 35.875C25.1409 35.875 28.6555 34.4313 31.543 31.5438C34.4305 28.6563 35.8742 25.1417 35.8742 21C35.8742 16.8583 34.4305 13.3438 31.543 10.4563C28.6555 7.56876 25.1409 6.12501 20.9992 6.12501C17.6451 6.12501 14.6482 7.13855 12.0086 9.16564C9.36901 11.1927 7.61172 13.825 6.73672 17.0625L3.93672 17.0625C4.89922 13.0667 6.96276 9.8073 10.1273 7.28439C13.2919 4.76147 16.9159 3.50001 20.9992 3.50001C23.4201 3.50001 25.6951 3.95939 27.8242 4.87813C29.9534 5.79689 31.8055 7.04376 33.3805 8.61876C34.9555 10.1938 36.2024 12.0458 37.1211 14.175C38.0399 16.3042 38.4992 18.5792 38.4992 21ZM27.3867 21L18.6367 29.75L16.7992 27.9125L22.3992 22.3125L3.54297 22.3125L3.54297 19.6875L22.3992 19.6875L16.7992 14.0875L18.6367 12.25L27.3867 21Z"
              fill="#5E5E5E"
            />
          </svg>
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
