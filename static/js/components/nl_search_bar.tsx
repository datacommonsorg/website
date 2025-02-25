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
 * Component for the search bar used for all NL queries.
 */

import React, { ReactElement, useEffect, useState } from "react";

import NlSearchBarHeaderInline from "./nl_search_bar/nl_search_bar_header_inline";
import { NlSearchBarStandard } from "./nl_search_bar/nl_search_bar_standard";

interface NlSearchBarPropType {
  variant?: "standard" | "header-inline";
  allowEmptySearch?: boolean;
  inputId: string;
  onSearch: (q: string) => void;
  initialValue: string;
  placeholder?: string;
  shouldAutoFocus?: boolean;
  feedbackLink?: string;
}

// an interface for the implementation of variants of the natural language search, passing shared common components
export interface NlSearchBarImplementationProps {
  //the value currently in state representing the entered search term
  value: string;
  //a boolean flag for invalid search entries
  invalid: boolean;
  //the placeholder text
  placeholder: string;
  //the id of the input
  inputId: string;
  //the change event (used to trigger appropriate state changes in this parent)
  onChange: (newValue: string) => void;
  //a function to be called once a search is run
  onSearch: () => void;
  //the autofocus attribute of the input will be set to shouldAutoFocus
  shouldAutoFocus?: boolean;
  //an optional feedback link
  feedbackLink?: string;
}

export function NlSearchBar(props: NlSearchBarPropType): ReactElement {
  const [invalid, setInvalid] = useState(false);
  const [value, setValue] = useState<string>("");
  useEffect(() => {
    setValue(props.initialValue);
    setInvalid(false);
  }, [props.initialValue]);

  function handleSearch(): void {
    if (!props.allowEmptySearch && !value) {
      setInvalid(true);
      return;
    }

    props.onSearch(value);
  }

  const commonProps: NlSearchBarImplementationProps = {
    value,
    invalid,
    placeholder: props.placeholder,
    inputId: props.inputId,
    onChange: (newValue: string) => {
      setValue(newValue);
      setInvalid(false);
    },
    onSearch: handleSearch,
    shouldAutoFocus: props.shouldAutoFocus,
    feedbackLink: props.feedbackLink,
  };

  const variant = props.variant || "standard";

  return variant === "header-inline" ? (
    <NlSearchBarHeaderInline {...commonProps} />
  ) : (
    <NlSearchBarStandard {...commonProps} />
  );
}
