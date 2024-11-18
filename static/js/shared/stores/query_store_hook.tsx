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

/* 
  This hook is a companion to the QueryStore, and provides components with the
  ability to subscribe to changes in that store.
 */

import { useEffect, useState } from "react";

import { QueryResult } from "../../types/app/explore_types";
import { QueryStore } from "./query_store";

interface QueryStoreData {
  queryString: string;
  placeholder: string;
  queryResult: QueryResult | null;
  debugData: any;
}

export const useQueryStore = (): QueryStoreData => {
  const [queryString, setQueryString] = useState<string>("");
  const [placeholder, setPlaceholder] = useState<string>(
    "Enter a question to explore"
  );
  const [queryResult, setQueryResult] = useState<QueryResult>(null);
  const [debugData, setDebugData] = useState<any>({});

  useEffect(() => {
    const queryStore = (globalThis.queryStore as QueryStore) || null;

    const handleStoreUpdate = (
      store: typeof queryStore,
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

    queryStore.subscribe(handleStoreUpdate);
    handleStoreUpdate(queryStore, "queryString");

    return () => {
      queryStore.unsubscribe(handleStoreUpdate);
    };
  }, []);

  return { queryString, placeholder, queryResult, debugData };
};
