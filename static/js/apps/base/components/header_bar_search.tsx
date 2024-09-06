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

/* A wrapping component to render the header bar version of the search */

import React, { ReactElement } from "react";

import { NlSearchBar } from "../../../components/nl_search_bar";
import {
  GA_EVENT_NL_SEARCH,
  GA_PARAM_QUERY,
  GA_PARAM_SOURCE,
  GA_VALUE_SEARCH_SOURCE_HOMEPAGE,
  triggerGAEvent,
} from "../../../shared/ga_events";

const HeaderBarSearch = (): ReactElement => {
  return (
    <NlSearchBar
      variant="header-inline"
      inputId="query-search-input"
      onSearch={(q): void => {
        triggerGAEvent(GA_EVENT_NL_SEARCH, {
          [GA_PARAM_QUERY]: q,
          [GA_PARAM_SOURCE]: GA_VALUE_SEARCH_SOURCE_HOMEPAGE,
        });
        window.location.href = `/explore#q=${encodeURIComponent(q)}`;
      }}
      placeholder={"Enter a question to explore"}
      initialValue={""}
      shouldAutoFocus={false}
    />
  );
};

export default HeaderBarSearch;
