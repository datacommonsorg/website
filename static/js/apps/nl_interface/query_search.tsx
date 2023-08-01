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

import React from "react";
import { Container } from "reactstrap";

import { TextSearchBar } from "../../components/text_search_bar";
import { useStoreActions, useStoreState } from "./app_state";

interface QuerySearchProps {
  query: string;
}

export function QuerySearch(props: QuerySearchProps): JSX.Element {
  const { query } = props;
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
  const updateConfig = useStoreActions((a) => a.updateConfig);

  return (
    <div id="search-container">
      <Container tabIndex={-1}>
        <div className="search-section">
          <div className="search-box-section">
            <TextSearchBar
              allowEmptySearch={
                /**
                 * If we're in auto-run manual mode, when a query runs an "empty search" (hits enter in a blank prompt),
                 * use this as a cue that we want to show the next URL prompt
                 */
                config.autoPlayCurrentQueryIndex < config.urlPrompts.length &&
                config.autoPlayManuallyShowQuery
              }
              inputId="query-search-input"
              onSearch={(q: string) => {
                /**
                 * Handle auto-play manual mode:
                 * Show the next url prompt when user hits enter in blank search bar
                 */
                if (config.autoPlayManuallyShowQuery && !q.trim()) {
                  updateConfig({
                    autoPlayCurrentQueryIndex:
                      config.autoPlayCurrentQueryIndex + 1,
                  });
                  return;
                }
                search({
                  config,
                  nlQueryContext,
                  nlQueryHistory,
                  query: q,
                });
              }}
              initialValue={query}
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
      </Container>
    </div>
  );
}
