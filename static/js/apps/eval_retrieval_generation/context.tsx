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

import { QUERY_FEEDBACK_CALL_ID } from "./constants";
import { DcCall, Query } from "./types";

interface AppContextType {
  doc: GoogleSpreadsheet;
  sheetId: string;
  userEmail: string;
  // Key is query id, value is the query object.
  allQuery: Record<number, Query>;
  // Key is call id, value is the call mapping (call id to call row index).
  allCall: Record<number, DcCall>;
}

/**
 * The AppContext contains static state that does not change when using the
 * tool. This includes the doc, sheet id, and the user email.
 */
export const AppContext = createContext<AppContextType>({
  allCall: null,
  allQuery: null,
  doc: null,
  sheetId: "",
  userEmail: "",
});

/**
 * Session context contains fields that can be set within child components and
 * are changed when the user interacts with the tool.
 */
interface SessionContextType {
  sessionQueryId: number;
  sessionCallId: number;
  setSessionQueryId: (queryId: number) => void;
  setSessionCallId: (callId: number) => void;
}

export const SessionContext = createContext<SessionContextType>({
  sessionCallId: 0,
  sessionQueryId: null,
  setSessionCallId: () => void {},
  setSessionQueryId: () => void {},
});

export function SessionContextProvider({
  children,
}: {
  children: JSX.Element;
}): JSX.Element {
  const [sessionQueryId, setSessionQueryId] = useState(1);
  const [sessionCallId, setSessionCallId] = useState(QUERY_FEEDBACK_CALL_ID);
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
