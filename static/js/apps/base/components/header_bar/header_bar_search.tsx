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

import React, { ReactElement, useEffect, useState } from "react";

import { NlSearchBar } from "../../../../components/nl_search_bar";
import {
  CLIENT_TYPES,
  URL_HASH_PARAMS,
} from "../../../../constants/app/explore_constants";
import {
  GA_EVENT_NL_SEARCH,
  GA_PARAM_QUERY,
  GA_PARAM_SOURCE,
  GA_VALUE_SEARCH_SOURCE_HOMEPAGE,
  triggerGAEvent,
} from "../../../../shared/ga_events";
import { HeaderStore } from "../../../../shared/stores/header_store";
import { QueryResult } from "../../../../types/app/explore_types";
import { updateHash } from "../../../../utils/url_utils";
import { DebugInfo } from "../../../explore/debug_info";

interface HeaderBarSearchProps {
  inputId?: string;
  searchBarHashMode?: boolean;
  gaValueSearchSource?: string;
}

const HeaderBarSearch = ({
  inputId = "query-search-input",
  searchBarHashMode,
  gaValueSearchSource,
}: HeaderBarSearchProps): ReactElement => {
  const [queryString, setQueryString] = useState<string>("");
  const [placeholder, setPlaceholder] = useState<string>(
    "Enter a question to explore"
  );
  const [queryResult, setQueryResult] = useState<QueryResult>(null);
  const [debugData, setDebugData] = useState<any>({});

  /* 
    The purpose of the following hook is to subscribe to changes in the header store
    used to communicate between other React apps (such as the explore section) and the
    header toolbar.
   */

  useEffect(() => {
    const headerStore = (globalThis.headerStore as HeaderStore) || null;
    const handleStoreUpdate = (
      store: typeof headerStore,
      changeType:
        | "debugObject"
        | "queryString"
        | "handleSearchFunction"
        | "queryResult"
    ): void => {
      if (changeType === "queryString") {
        const newQueryString = store.getQueryString();
        if (newQueryString !== null) {
          setQueryString(newQueryString);
          setPlaceholder(newQueryString);
        }
      } else if (changeType === "debugObject") {
        const newDebugObject = store.getDebugObject();
        if (newDebugObject !== null) {
          setDebugData(newDebugObject);
        }
      } else if (changeType === "queryResult") {
        const newQueryResult = store.getQueryResult();
        if (newQueryResult !== null) {
          setQueryResult(newQueryResult);
        }
      }
    };

    headerStore.subscribe(handleStoreUpdate);
    handleStoreUpdate(headerStore, "queryString");

    return () => {
      headerStore.unsubscribe(handleStoreUpdate);
    };
  }, []);

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
            window.location.href = `/explore#q=${encodeURIComponent(q)}`;
          }
        }}
        placeholder={placeholder}
        initialValue={queryString}
        shouldAutoFocus={false}
      />
      <DebugInfo debugData={debugData} queryResult={queryResult}></DebugInfo>
    </div>
  );
};

export default HeaderBarSearch;
