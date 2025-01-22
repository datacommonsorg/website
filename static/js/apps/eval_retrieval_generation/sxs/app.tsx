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
import { AnswerWithTables } from "./answer_with_tables";
import { SessionContext } from "./context";
import { getRatedQueryIds } from "./data_store";
import { getLeftAndRight } from "./left_right_picker";
import { SxsFeedback } from "./sxs_feedback";

interface AppPropType {
  sessionId: string;
  sheetIdA: string;
  sheetIdB: string;
}

interface CombinedDocInfo {
  docInfoA: DocInfo;
  docInfoB: DocInfo;
  sortedQueryIds: number[];
}

function getSortedQueryIds(docInfoA: DocInfo, docInfoB: DocInfo): number[] {
  const idsA = Object.keys(docInfoA.allQuery || {});
  const idsB = Object.keys(docInfoB.allQuery || {});
  return idsA
    .filter((id) => idsB.includes(id))
    .map((id) => Number(id))
    .sort((a, b) => a - b);
}

/** Returns the ID of the first unevaluated query. */
async function getStartingQueryId(
  props: AppPropType,
  sortedQueryIds: number[]
): Promise<number> {
  const completedIds = await getRatedQueryIds(
    props.sheetIdA,
    props.sheetIdB,
    props.sessionId
  );
  for (const queryId of sortedQueryIds) {
    if (!completedIds.includes(queryId)) {
      return queryId;
    }
  }
  // If all evals are complete, show the first query.
  return sortedQueryIds[0];
}

export function App(props: AppPropType): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [combinedDocInfo, setCombinedDocInfo] = useState<CombinedDocInfo>(null);
  const { setSessionQueryId, sessionQueryId } = useContext(SessionContext);

  useEffect(() => {
    let subscribed = true;
    if (combinedDocInfo?.sortedQueryIds.length) {
      getStartingQueryId(props, combinedDocInfo.sortedQueryIds).then(
        (startingQueryId) => {
          if (!subscribed) return;
          setSessionQueryId(startingQueryId);
        }
      );
    }
    return () => void (subscribed = false);
  }, [combinedDocInfo]);

  const { leftDocInfo, rightDocInfo } = getLeftAndRight(
    props.sessionId,
    combinedDocInfo?.docInfoA,
    combinedDocInfo?.docInfoB,
    sessionQueryId
  );

  // Sign in automatically.
  useEffect(() => {
    const scopes = ["https://www.googleapis.com/auth/spreadsheets"];

    const handleUserSignIn = async (
      user: User,
      credential: OAuthCredential
    ): Promise<void> => {
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
            setCombinedDocInfo({
              docInfoA,
              docInfoB,
              sortedQueryIds: getSortedQueryIds(docInfoA, docInfoB),
            });
          }
        );
      }
    };

    signInWithGoogle(scopes, handleUserSignIn);
  }, []);

  const initialLoadCompleted = combinedDocInfo && sessionQueryId;
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
      {user && !initialLoadCompleted && (
        <div className="banner">
          <p>Loading query...</p>
        </div>
      )}
      {initialLoadCompleted && (
        <>
          <div className="sxs-app-content">
            <div className="query-header">
              <h3>Query {sessionQueryId}</h3>
              {leftDocInfo.allQuery[sessionQueryId].text}
            </div>
            <div className="sxs-panes">
              <AnswerWithTables docInfo={leftDocInfo} />
              <div className="divider" />
              <AnswerWithTables docInfo={rightDocInfo} />
            </div>
            <SxsFeedback
              leftSheetId={leftDocInfo.doc.spreadsheetId}
              rightSheetId={rightDocInfo.doc.spreadsheetId}
              sessionId={props.sessionId}
              sortedQueryIds={combinedDocInfo.sortedQueryIds}
              allQuery={leftDocInfo.allQuery}
              userEmail={user.email}
            ></SxsFeedback>
          </div>
        </>
      )}
    </>
  );
}
