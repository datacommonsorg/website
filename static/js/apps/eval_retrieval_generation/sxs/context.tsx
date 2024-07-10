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

import React, { createContext, useState } from "react";

import { DocInfo } from "../types";

interface AppContextType {
  sessionId: string;
  docInfoA: DocInfo;
  docInfoB: DocInfo;
}

/**
 * The AppContext contains static state that does not change when using the
 * tool.
 */
export const AppContext = createContext<AppContextType>({
  sessionId: "",
  docInfoA: null,
  docInfoB: null,
});

/**
 * Session context contains fields that can be set within child components and
 * are changed when the user interacts with the tool.
 */
interface SessionContextType {
  sessionQueryId: number;
  setSessionQueryId: (queryId: number) => void;
}

export const SessionContext = createContext<SessionContextType>({
  sessionQueryId: null,
  setSessionQueryId: () => void {},
});

export function SessionContextProvider({
  children,
}: {
  children: JSX.Element;
}): JSX.Element {
  const [sessionQueryId, setSessionQueryId] = useState(1);
  return (
    <SessionContext.Provider
      value={{
        sessionQueryId,
        setSessionQueryId,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
