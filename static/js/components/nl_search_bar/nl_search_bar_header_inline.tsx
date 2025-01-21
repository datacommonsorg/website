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

import React, { ReactElement, useEffect, useState } from "react";

import { isFeatureEnabled } from "../../shared/util";
import { NlSearchBarImplementationProps } from "../nl_search_bar";
import { AutoCompleteInput } from "./auto_complete_input";

const NlSearchBarHeaderInline = ({
  value,
  invalid,
  placeholder,
  inputId,
  onChange,
  onSearch,
  shouldAutoFocus,
}: NlSearchBarImplementationProps): ReactElement => {
  const [autocompleteEnabled, setAutoCompleteEnabled] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const isAutopushEnv = window.location.hostname == "autopush.datacommons.org";

  useEffect(() => {
    setAutoCompleteEnabled(
      isFeatureEnabled("autocomplete") ||
        isAutopushEnv ||
        (urlParams.has("ac_on") && urlParams.get("ac_on") == "true")
    );
  }, []);

  return (
    <div className="header-search-section">
      <AutoCompleteInput
        enableAutoComplete={autocompleteEnabled}
        value={value}
        invalid={invalid}
        placeholder={placeholder}
        inputId={inputId}
        onChange={onChange}
        onSearch={onSearch}
        feedbackLink=""
        shouldAutoFocus={shouldAutoFocus}
        barType="header"
      />
    </div>
  );
};

export default NlSearchBarHeaderInline;
