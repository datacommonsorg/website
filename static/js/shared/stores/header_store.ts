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
  A store object with global scope to allow disparate and otherwise unrelated React root
  points to be able to communicate with the header. This is primarily used by roots such
  as the explore section implementation to communicate with the header.
 */

import { QueryResult } from "../../types/app/explore_types";

type Listener = (store: HeaderStore, changeType: ChangeType) => void;
type ChangeType =
  | "debugObject"
  | "queryString"
  | "handleSearchFunction"
  | "queryResult";

export class HeaderStore {
  private debugObject: any = null;
  private queryString: string | null = null;
  private handleSearchFunction: ((q: string) => void) | null = null;
  private queryResult: QueryResult | null = null;
  private listeners: Listener[] = [];

  setDebugObject(debugObject: any): void {
    this.debugObject = debugObject;
    this.notifyListeners("debugObject");
  }

  setQueryString(queryString: string): void {
    this.queryString = queryString;
    this.notifyListeners("queryString");
  }

  setHandleSearchFunction(func: (q: string) => void): void {
    this.handleSearchFunction = func;
    this.notifyListeners("handleSearchFunction");
  }

  setQueryResult(queryResult: QueryResult): void {
    this.queryResult = queryResult;
    this.notifyListeners("queryResult");
  }

  getDebugObject(): any {
    return this.debugObject;
  }

  getQueryString(): string | null {
    return this.queryString;
  }

  getHandleSearchFunction(): ((q: string) => void) | null {
    return this.handleSearchFunction;
  }

  getQueryResult(): QueryResult | null {
    return this.queryResult;
  }

  subscribe(listener: Listener): void {
    this.listeners.push(listener);
  }

  unsubscribe(listener: Listener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notifyListeners(changeType: ChangeType): void {
    this.listeners.forEach((listener) => listener(this, changeType));
  }
}

export const headerStore = new HeaderStore();

globalThis.headerStore = headerStore;
