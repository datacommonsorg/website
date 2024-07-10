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

import { OAuthCredential, User } from "firebase/auth";
import { GoogleSpreadsheet } from "google-spreadsheet";
import React, { useContext, useEffect, useState } from "react";

import { signInWithGoogle } from "../../../utils/google_signin";
import { DocInfo } from "../types";
import { getDocInfo } from "../util";
import { AppContext, SessionContext } from "./context";
import { getLeftAndRight } from "./left_right_picker";
import { QueryWithTables } from "./query_with_tables";

interface AppPropType {
  sessionId: string;
  sheetIdA: string;
  sheetIdB: string;
}

export function App(props: AppPropType): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [docInfos, setDocInfos] = useState<{ a: DocInfo; b: DocInfo }>(null);
  const { setSessionQueryId, sessionQueryId } = useContext(SessionContext);
  const { left, right } = getLeftAndRight(
    props.sessionId,
    docInfos?.a,
    docInfos?.b,
    sessionQueryId
  );
  async function handleUserSignIn(
    user: User,
    credential: OAuthCredential
  ): Promise<void> {
    if (credential.accessToken) {
      setUser(user); // Set the user state to the signed-in user
      const docA = new GoogleSpreadsheet(props.sheetIdA, {
        token: credential.accessToken,
      });
      const docB = new GoogleSpreadsheet(props.sheetIdB, {
        token: credential.accessToken,
      });
      // Wait for documents to load
      await Promise.all([docA.loadInfo(), docB.loadInfo()]);
      // Get and set information about each document
      Promise.all([getDocInfo(docA), getDocInfo(docB)]).then(
        ([docInfoA, docInfoB]) => {
          setSessionQueryId(1);
          setDocInfos({ a: docInfoA, b: docInfoB });
        }
      );
    }
  }

  // Sign in automatically.
  useEffect(() => {
    const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
    signInWithGoogle(scopes, handleUserSignIn);
  }, []);

  return (
    <>
      {!user && (
        <div>
          <p>Signing you in...</p>
          <p>
            If you are not signed in after a few seconds, check that pop-ups are
            allowed and refresh the page.
          </p>
        </div>
      )}

      {user && <p>Signed in as {user.email}</p>}
      {user && !docInfos && <p>Loading query...</p>}
      {docInfos && (
        <AppContext.Provider
          value={{
            sessionId: props.sessionId,
            docInfoA: docInfos.a,
            docInfoB: docInfos.b,
          }}
        >
          <div className="app-content">
            <QueryWithTables docInfo={left}></QueryWithTables>
            <div className="divider" />
            <QueryWithTables docInfo={right}></QueryWithTables>
          </div>
        </AppContext.Provider>
      )}
    </>
  );
}
