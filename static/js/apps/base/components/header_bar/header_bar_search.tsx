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

import { NlSearchBar } from "../../../../components/nl_search_bar";
import {
  CLIENT_TYPES,
  URL_HASH_PARAMS,
} from "../../../../constants/app/explore_constants";
import { localizeLink } from "../../../../i18n/i18n";
import {
  GA_EVENT_NL_SEARCH,
  GA_PARAM_QUERY,
  GA_PARAM_SOURCE,
  GA_VALUE_SEARCH_SOURCE_HOMEPAGE,
  triggerGAEvent,
} from "../../../../shared/ga_events";
import { useQueryStore } from "../../../../shared/stores/query_store_hook";
import { updateHash } from "../../../../utils/url_utils";
import { DebugInfo } from "../../../explore/debug_info";

interface HeaderBarSearchProps {
  inputId?: string;
  searchBarHashMode?: boolean;
  gaValueSearchSource?: string;
}

// The search query param name. Used to pre-populate the search bar.
const QUERY_PARAM = "q";

const HeaderBarSearch = ({
  inputId = "query-search-input",
  searchBarHashMode,
  gaValueSearchSource,
}: HeaderBarSearchProps): ReactElement => {
  const { queryString, placeholder, queryResult, debugData } = useQueryStore();

  // Get the query string from the url params.
  const urlParams = new URLSearchParams(window.location.search);
  const urlQuery = urlParams.get(QUERY_PARAM) || "";

  // If the search bar is in hash mode, use the query string from the url params.
  // Otherwise, use the query string from the query store.
  const initialValue = searchBarHashMode ? queryString : urlQuery;

  return (
    <div className="header-search">
      <NlSearchBar
        variant="header-inline"
        inputId={inputId}
        onSearch={(q): void => {
          if (searchBarHashMode) {
            triggerGAEvent(GA_EVENT_NL_SEARCH, {
              [GA_PARAM_QUERY]: q,
              [GA_PARAM_SOURCE]:
                gaValueSearchSource ?? GA_VALUE_SEARCH_SOURCE_HOMEPAGE,
            });
            updateHash({
              [URL_HASH_PARAMS.QUERY]: q,
              [URL_HASH_PARAMS.PLACE]: "",
              [URL_HASH_PARAMS.TOPIC]: "",
              [URL_HASH_PARAMS.CLIENT]: CLIENT_TYPES.QUERY,
            });
          } else {
            triggerGAEvent(GA_EVENT_NL_SEARCH, {
              [GA_PARAM_QUERY]: q,
              [GA_PARAM_SOURCE]:
                gaValueSearchSource ?? GA_VALUE_SEARCH_SOURCE_HOMEPAGE,
            });
            // Localize the url to maintain the current page's locale.
            const localizedUrl = localizeLink(`/explore`);
            const localizedUrlWithQuery = `${localizedUrl}#q=${encodeURIComponent(
              q
            )}`;
            window.location.href = localizedUrlWithQuery;
          }
        }}
        placeholder={placeholder}
        initialValue={initialValue}
        shouldAutoFocus={false}
      />
      <DebugInfo debugData={debugData} queryResult={queryResult}></DebugInfo>
    </div>
  );
};

export default HeaderBarSearch;
