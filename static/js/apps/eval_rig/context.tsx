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

import { GoogleSpreadsheet } from "google-spreadsheet";
import React, { createContext, useState } from "react";

import { Query } from "./query_section";

interface AppContextType {
  doc: GoogleSpreadsheet;
  sheetId: string;
  userEmail: string;
  allQuery: Record<number, Query>;
  allCall: Record<number, Record<number, number>>;
}

export const AppContext = createContext<AppContextType>({
  doc: null,
  sheetId: "",
  userEmail: "",
  allQuery: null,
  allCall: null,
});

interface SessionContextType {
  sessionQueryId: number;
  sessionCallId: number;
  setSessionQueryId: (queryId: number) => void;
  setSessionCallId: (callId: number) => void;
}

export const SessionContext = createContext<SessionContextType>({
  sessionQueryId: 1,
  sessionCallId: 1,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setSessionQueryId: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setSessionCallId: () => {},
});

export function SessionContextProvider({
  children,
}: {
  children: JSX.Element;
}): JSX.Element {
  const [sessionQueryId, setSessionQueryId] = useState(1);
  const [sessionCallId, setSessionCallId] = useState(1);
  return (
    <SessionContext.Provider
      value={{
        sessionQueryId,
        sessionCallId,
        setSessionQueryId,
        setSessionCallId,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
