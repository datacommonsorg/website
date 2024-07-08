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
import React, { useContext, useState } from "react";

import { GoogleSignIn } from "../../utils/google_signin";
import { CallFeedback } from "./call_feedback";
import { AppContext, SessionContext } from "./context";
import { OverallFeedback } from "./overall_feedback";
import { QuerySection } from "./query_section";
import { RagAnsFeedback } from "./rag_ans_feedback";
import { DcCall, EvalType, FeedbackStage, Query } from "./types";
import { getDocInfo, getFirstFeedbackStage } from "./util";

interface AppPropType {
  sheetId: string;
}

// Get first query to show which should be the first question of this user or a
// question with no user.
function getFirstQuery(
  allQuery: Record<number, Query>,
  userEmail: string
): number {
  let queryId: number = null;
  let nullQueryId: number = null;
  const sortedQueryIds = Object.keys(allQuery)
    .map((qKey) => Number(qKey))
    .sort((a, b) => a - b);
  for (const qId of sortedQueryIds) {
    if (allQuery[qId].user === userEmail) {
      queryId = qId;
      break;
    }
    if (nullQueryId === null && allQuery[qId].user === null) {
      nullQueryId = qId;
    }
  }
  if (queryId === null && nullQueryId !== null) {
    queryId = nullQueryId;
  }
  if (queryId !== null) {
    return queryId;
  } else {
    return sortedQueryIds[0];
  }
}

export function App(props: AppPropType): JSX.Element {
  const {
    setSessionQueryId,
    setFeedbackStage,
    feedbackStage,
    sessionQueryId,
    sessionCallId,
  } = useContext(SessionContext);
  const [user, setUser] = useState<User | null>(null);
  const [doc, setDoc] = useState<GoogleSpreadsheet>(null);
  const [allQuery, setAllQuery] = useState<Record<number, Query>>(null);
  const [allCall, setAllCall] = useState<Record<number, DcCall>>(null);
  const [evalType, setEvalType] = useState<EvalType>(null);

  async function handleUserSignIn(user: User, credential: OAuthCredential) {
    if (credential.accessToken) {
      setUser(user); // Set the user state to the signed-in user
      const doc = new GoogleSpreadsheet(props.sheetId, {
        token: credential.accessToken,
      });
      await doc.loadInfo();
      setDoc(doc);
      getDocInfo(doc).then((docInfo) => {
        setAllCall(docInfo.allCall);
        setAllQuery(docInfo.allQuery);
        setFeedbackStage(getFirstFeedbackStage(docInfo.evalType));
        setEvalType(docInfo.evalType);
        setSessionQueryId(getFirstQuery(docInfo.allQuery, user.email));
      });
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

      {user && (
        <>
          <a
            href={`https://docs.google.com/spreadsheets/d/${props.sheetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="google-sheet-link"
          >
            Google Sheet Link
          </a>
          <p>Signed in as {user.email}</p>
          {allQuery && allCall && doc && sessionQueryId && evalType && (
            <AppContext.Provider
              value={{
                allCall,
                allQuery,
                doc,
                evalType,
                sheetId: props.sheetId,
                userEmail: user.email,
              }}
            >
              <div className="app-content">
                <QuerySection
                  doc={doc}
                  evalType={evalType}
                  feedbackStage={feedbackStage}
                  query={allQuery[sessionQueryId]}
                  callId={sessionCallId}
                  allCall={allCall}
                />
                {(feedbackStage === FeedbackStage.OVERALL_ANS ||
                  feedbackStage === FeedbackStage.OVERALL_QUESTIONS) && (
                  <OverallFeedback />
                )}
                {feedbackStage === FeedbackStage.CALLS && <CallFeedback />}
                {feedbackStage === FeedbackStage.RAG_ANS && <RagAnsFeedback />}
              </div>
            </AppContext.Provider>
          )}
        </>
      )}
    </>
  );
}
