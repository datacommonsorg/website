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
import {
  CALL_ID_COL,
  DC_CALL_SHEET,
  QA_SHEET,
  QUERY_COL,
  QUERY_FEEDBACK_CALL_ID,
  QUERY_ID_COL,
  USER_COL,
} from "./constants";
import { AppContext, SessionContext } from "./context";
import { QueryFeedback } from "./query_feedback";
import { QuerySection } from "./query_section";
import { DcCall, Query } from "./types";

// Map from sheet name to column name to column index
type HeaderInfo = Record<string, Record<string, number>>;

interface AppPropType {
  sheetId: string;
}

export function App(props: AppPropType): JSX.Element {
  const { setSessionQueryId, sessionQueryId, sessionCallId } =
    useContext(SessionContext);
  const [user, setUser] = useState<User | null>(null);
  const [doc, setDoc] = useState<GoogleSpreadsheet>(null);
  const [allQuery, setAllQuery] = useState<Record<number, Query>>(null);
  const [allCall, setAllCall] = useState<Record<number, DcCall>>(null);

  async function loadHeader(doc: GoogleSpreadsheet): Promise<HeaderInfo> {
    const result: HeaderInfo = {};
    for (const sheetName of [QA_SHEET, DC_CALL_SHEET]) {
      result[sheetName] = {};
      const sheet = doc.sheetsByTitle[sheetName];
      await sheet.loadHeaderRow();
      for (let i = 0; i < sheet.headerValues.length; i++) {
        const colName = sheet.headerValues[i];
        result[sheetName][colName] = i;
      }
    }
    return result;
  }

  const loadQuery = (
    doc: GoogleSpreadsheet,
    allHeader: HeaderInfo,
    userEmail: string
  ) => {
    const sheet = doc.sheetsByTitle[QA_SHEET];
    const header = allHeader[QA_SHEET];
    const numRows = sheet.rowCount;
    const loadPromises = [];
    for (const col of [QUERY_ID_COL, USER_COL, QUERY_COL]) {
      loadPromises.push(
        sheet.loadCells({
          startColumnIndex: header[col],
          endColumnIndex: header[col] + 1,
        })
      );
    }
    Promise.all(loadPromises).then(() => {
      const allQuery: Record<number, Query> = {};
      for (let i = 1; i < numRows; i++) {
        const id = Number(sheet.getCell(i, header[QUERY_ID_COL]).value);
        allQuery[id] = {
          id,
          row: i,
          text: String(sheet.getCell(i, header[QUERY_COL]).value),
          user: String(sheet.getCell(i, header[USER_COL]).value),
        };
      }
      setAllQuery(allQuery);
      // Jump to the first question of this user or a question with no user.
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
        setSessionQueryId(queryId);
      } else {
        setSessionQueryId(sortedQueryIds[0]);
      }
    });
  };

  const loadCall = (doc: GoogleSpreadsheet, allHeader: HeaderInfo) => {
    const sheet = doc.sheetsByTitle[DC_CALL_SHEET];
    const header = allHeader[DC_CALL_SHEET];
    const numRows = sheet.rowCount;
    const loadPromises = [];
    for (const col of [QUERY_ID_COL, CALL_ID_COL]) {
      loadPromises.push(
        sheet.loadCells({
          startColumnIndex: header[col],
          endColumnIndex: header[col] + 1,
        })
      );
    }
    Promise.all(loadPromises).then(() => {
      const tmp: Record<number, DcCall> = {};
      for (let i = 1; i < numRows; i++) {
        const row = i;
        const queryId = Number(sheet.getCell(i, header[QUERY_ID_COL]).value);
        const callId = Number(sheet.getCell(i, header[CALL_ID_COL]).value);
        if (!tmp[queryId]) {
          tmp[queryId] = {};
        }
        tmp[queryId][callId] = row;
      }
      setAllCall(tmp);
    });
  };

  async function handleUserSignIn(user: User, credential: OAuthCredential) {
    if (credential.accessToken) {
      setUser(user); // Set the user state to the signed-in user
      const doc = new GoogleSpreadsheet(props.sheetId, {
        token: credential.accessToken,
      });
      await doc.loadInfo();
      setDoc(doc);
      loadHeader(doc).then((allHeader) => {
        loadQuery(doc, allHeader, user.email);
        loadCall(doc, allHeader);
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
          >
            Google Sheet Link
          </a>
          <p>Signed in as {user.email}</p>
          {allQuery && allCall && doc && sessionQueryId && (
            <AppContext.Provider
              value={{
                allCall,
                allQuery,
                doc,
                sheetId: props.sheetId,
                userEmail: user.email,
              }}
            >
              <div className="app-content">
                <QuerySection />
                <div className="feedback-pane">
                  {sessionCallId === QUERY_FEEDBACK_CALL_ID ? (
                    <QueryFeedback />
                  ) : (
                    <CallFeedback />
                  )}
                </div>
              </div>
            </AppContext.Provider>
          )}
        </>
      )}
    </>
  );
}
