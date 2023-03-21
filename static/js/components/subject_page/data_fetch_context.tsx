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

import React, { createContext, useCallback, useMemo, useRef } from "react";

/**
 * The Data Fetch Context and the Provider component. This is used to cache
 * data fetches.
 */

interface DataFetchContextType {
  // A function to use to fetch data with a given cache key and data promise.
  // If the cacheKey is found in the cache, returns the cached promise.
  // Otherwise, saves the data promise in the cache and returns the promise.
  fetchData: (
    cacheKey: string,
    dataPromise: () => Promise<any>
  ) => Promise<any>;
}

export const DataFetchContext = createContext({} as DataFetchContextType);

interface DataFetchContextProviderPropType {
  id: string;
  children: React.ReactNode;
}

export function DataFetchContextProvider(
  props: DataFetchContextProviderPropType
) {
  const fetchingCache = useRef<Record<string, Promise<any>>>({});
  const fetchData = useCallback(
    (cacheKey: string, dataPromise: () => Promise<any>) => {
      const cache = fetchingCache.current;
      if (!(cacheKey in cache)) {
        cache[cacheKey] = dataPromise();
      }
      return cache[cacheKey];
    },
    []
  );
  const contextValue = useMemo(
    () => ({
      fetchData,
    }),
    [fetchData]
  );

  return (
    <DataFetchContext.Provider key={props.id} value={contextValue}>
      {props.children}
    </DataFetchContext.Provider>
  );
}
