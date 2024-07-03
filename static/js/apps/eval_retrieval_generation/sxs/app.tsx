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
import React, { useState } from "react";

import { GoogleSignIn } from "../../../utils/google_signin";
import { QuerySection } from "../query_section";
import { TablePane } from "../table_pane";
import { DocInfo, EvalType, FeedbackStage } from "../types";
import { getDocInfo } from "../util";

interface AppPropType {
  sessionId: string;
  sheetIdA: string;
  sheetIdB: string;
}

export function App(props: AppPropType): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [docInfo, setDocInfo] = useState<{ left: DocInfo; right: DocInfo }>(
    null
  );
  const [queryId, setQueryId] = useState<number>(1);

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
          // randomize which side each document goes on
          if (Math.floor(Math.random() * 2) === 0) {
            setDocInfo({ left: docInfoA, right: docInfoB });
          } else {
            setDocInfo({ left: docInfoB, right: docInfoA });
          }
        }
      );
    }
  }

  return (
    <>
      {!user && (
        <div className="sign-in">
          <GoogleSignIn
            onSignIn={handleUserSignIn}
            scopes={["https://www.googleapis.com/auth/spreadsheets"]}
          />
        </div>
      )}

      {user && <p>Signed in as {user.email}</p>}
      {docInfo && (
        <>
          <div className="app-content">
            <div className="sxs-pane">
              <QuerySection
                doc={docInfo.left.doc}
                evalType={docInfo.left.evalType}
                feedbackStage={FeedbackStage.SXS}
                query={docInfo.left.allQuery[queryId]}
              />
              {docInfo.left.evalType === EvalType.RAG && (
                <TablePane
                  doc={docInfo.left.doc}
                  calls={docInfo.left.allCall[queryId]}
                />
              )}
            </div>
            <div className="divider" />
            <div className="sxs-pane">
              <QuerySection
                doc={docInfo.right.doc}
                evalType={docInfo.right.evalType}
                feedbackStage={FeedbackStage.SXS}
                query={docInfo.right.allQuery[queryId]}
              />
              {docInfo.right.evalType === EvalType.RAG && (
                <TablePane
                  doc={docInfo.right.doc}
                  calls={docInfo.right.allCall[queryId]}
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
