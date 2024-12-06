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
import { ChangeType, QueryStore } from "./query_store";

interface QueryStoreData {
  queryString: string;
  placeholder: string;
  queryResult: QueryResult | null;
  debugData: any;
  setQueryString: (query: string) => void;
  setQueryResult: (result: QueryResult) => void;
  setDebugData: (data: any) => void;
}

export const useQueryStore = (): QueryStoreData => {
  const [queryString, setQueryStringState] = useState<string>("");
  const [placeholder, setPlaceholderState] = useState<string>(
    "Enter a question to explore"
  );
  const [queryResult, setQueryResultState] = useState<QueryResult>(null);
  const [debugData, setDebugDataState] = useState<any>({});

  /**
   * This useEffect subscribes to the QueryStore and updates the component's state whenever the store changes,
   * ensuring that the local state of the hook reflect the current store state. This local state is then
   * provided to the component that consumes the hook, allowing the hook to act as an intermediary between
   * the store and the consuming component.
   *
   * The subscription is then cleaned on component unmount.
   */
  useEffect(() => {
    const queryStore = (globalThis.queryStore as QueryStore) || null;

    const handleStoreUpdate = (
      store: typeof queryStore,
      changeType: ChangeType
    ): void => {
      if (changeType === "queryString") {
        const newQueryString = store.getQueryString();
        if (newQueryString !== null) {
          setQueryStringState(newQueryString);
          setPlaceholderState(newQueryString);
        }
      } else if (changeType === "debugObject") {
        const newDebugObject = store.getDebugObject();
        if (newDebugObject !== null) {
          setDebugDataState(newDebugObject);
        }
      } else if (changeType === "queryResult") {
        const newQueryResult = store.getQueryResult();
        if (newQueryResult !== null) {
          setQueryResultState(newQueryResult);
        }
      }
    };

    queryStore.subscribe(handleStoreUpdate);
    handleStoreUpdate(queryStore, "queryString");

    return () => {
      queryStore.unsubscribe(handleStoreUpdate);
    };
  }, []);

  const setQueryString = (query: string): void => {
    setQueryStringState(query);
    globalThis.queryStore.setQueryString(query);
  };

  const setQueryResult = (result: QueryResult): void => {
    setQueryResultState(result);
    globalThis.queryStore.setQueryResult(result);
  };

  const setDebugData = (data: any): void => {
    setDebugDataState(data);
    globalThis.queryStore.setDebugObject(data);
  };

  return {
    queryString,
    placeholder,
    queryResult,
    debugData,
    setQueryString,
    setQueryResult,
    setDebugData,
  };
};
