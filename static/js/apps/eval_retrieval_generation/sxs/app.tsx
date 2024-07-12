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
import { SessionContext } from "./context";
import { getLeftAndRight } from "./left_right_picker";
import { QueryWithTables } from "./query_with_tables";
import { SxsFeedback } from "./sxs_feedback";

interface AppPropType {
  sessionId: string;
  sheetIdA: string;
  sheetIdB: string;
}

function getSortedQueryIds(docInfos: { a: DocInfo; b: DocInfo }) {
  const idsA = Object.keys(docInfos?.a?.allQuery || {});
  const idsB = Object.keys(docInfos?.b?.allQuery || {});
  return idsA
    .filter((id) => idsB.includes(id))
    .map((id) => Number(id))
    .sort((a, b) => a - b);
}

export function App(props: AppPropType): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [docInfos, setDocInfos] = useState<{ a: DocInfo; b: DocInfo }>(null);
  const { setSessionQueryId, sessionQueryId } = useContext(SessionContext);
  const sortedQueryIds = getSortedQueryIds(docInfos);
  if (!sessionQueryId && sortedQueryIds.length) {
    setSessionQueryId(sortedQueryIds[0]);
  }
  const { leftDocInfo, rightDocInfo } = getLeftAndRight(
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
        <div className="banner">
          <p>Signing you in...</p>
          <p>
            If you are not signed in after a few seconds, check that pop-ups are
            allowed and refresh the page.
          </p>
        </div>
      )}

      {user && (
        <div className="banner">
          <p>Signed in as {user.email}</p>
        </div>
      )}
      {user && !docInfos && (
        <div className="banner">
          <p>Loading query...</p>
        </div>
      )}
      {docInfos && (
        <>
          <div className="sxs-app-content">
            <div className="sxs-panes">
              <QueryWithTables docInfo={leftDocInfo} />
              <div className="divider" />
              <QueryWithTables docInfo={rightDocInfo} />
            </div>
            <SxsFeedback
              leftSheetId={leftDocInfo.doc.spreadsheetId}
              rightSheetId={rightDocInfo.doc.spreadsheetId}
              sessionId={props.sessionId}
              sortedQueryIds={sortedQueryIds}
              userEmail={user.email}
            ></SxsFeedback>
          </div>
        </>
      )}
    </>
  );
}
