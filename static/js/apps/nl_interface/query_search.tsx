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
 * Component for search section of the NL interface.
 */

import _ from "lodash";
import React from "react";
import { Container } from "reactstrap";

import { TextSearchBar } from "../../components/text_search_bar";
import { useStoreActions, useStoreState } from "./app_state";
import { NLOptions } from "./nl_options";

export function QuerySearch(): JSX.Element {
  const config = useStoreState((s) => s.config);
  const nlQueryContext = useStoreState(
    (s) => s.nlQueryContexts[config.currentNlQueryContextId]
  );
  const nlQueryHistory = useStoreState((s) => {
    if (!nlQueryContext) {
      return [];
    }
    return nlQueryContext.nlQueryIds.map((nlQueryId) => s.nlQueries[nlQueryId]);
  });
  const search = useStoreActions((a) => a.search);

  return (
    <div id="search-container">
      <Container tabIndex={-1}>
        <div className="search-section">
          <div className="search-box-section">
            <TextSearchBar
              inputId="query-search-input"
              onSearch={(q) => {
                search({
                  config,
                  nlQueryContext,
                  nlQueryHistory,
                  query: q,
                });
              }}
              initialValue=""
              placeholder={
                nlQueryHistory.length > 0
                  ? ""
                  : `For example "${config.placeholderQuery}"`
              }
              shouldAutoFocus={true}
              clearValueOnSearch={true}
            />
          </div>
        </div>
        <NLOptions />
      </Container>
    </div>
  );
}
