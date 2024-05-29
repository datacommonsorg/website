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

import { GoogleSignIn } from "../../utils/google_signin";
import {
  CALL_ID_COL,
  DCCallSheet,
  QASheet,
  QUERY_COL,
  QUERY_ID_COL,
  USER_COL,
} from "./constants";
import { Query, QuerySection } from "./query_section";

// Map from sheet name to column name to column index
type HeaderInfo = Record<string, Record<string, number>>;

interface AppPropType {
  sheetId: string;
}

export function App(props: AppPropType): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [doc, setDoc] = useState<GoogleSpreadsheet>();
  const [allQuery, setAllQuery] = useState<Record<string, Query>>({});
  const [allCall, setAllCall] = useState<
    Record<string, Record<string, number>>
  >({});

  async function loadHeader(doc: GoogleSpreadsheet) {
    const result = {};
    for (const sheetName of [QASheet, DCCallSheet]) {
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

  const loadQuery = (doc: GoogleSpreadsheet, allHeader: HeaderInfo) => {
    const sheet = doc.sheetsByTitle[QASheet];
    const header = allHeader[QASheet];
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
      const allQuery: Record<string, Query> = {};
      for (let i = 1; i < numRows; i++) {
        allQuery[sheet.getCell(i, header[QUERY_ID_COL]).value as string] = {
          rowIdx: i,
          text: sheet.getCell(i, header[QUERY_COL]).value as string,
          user: sheet.getCell(i, header[USER_COL]).value as string,
        };
      }
      setAllQuery(allQuery);
    });
  };

  const loadCall = (doc: GoogleSpreadsheet, allHeader: HeaderInfo) => {
    const sheet = doc.sheetsByTitle[DCCallSheet];
    const header = allHeader[DCCallSheet];
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
      const allCall: Record<string, Record<string, number>> = {};
      for (let i = 1; i < numRows; i++) {
        const rowIdx = i;
        const queryId = sheet.getCell(i, header[QUERY_ID_COL]).value as string;
        const callId = sheet.getCell(i, header[CALL_ID_COL]).value as string;
        if (!allCall[queryId]) {
          allCall[queryId] = {};
        }
        allCall[queryId][callId] = rowIdx;
      }
      setAllCall(allCall);
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
        loadQuery(doc, allHeader);
        loadCall(doc, allHeader);
      });
    }
  }

  return (
    <>
      <div>
        {!user && (
          <GoogleSignIn
            onSignIn={handleUserSignIn}
            scopes={["https://www.googleapis.com/auth/spreadsheets"]}
          />
        )}
        {user && <p>Signed in as {user.email}</p>}
        {allQuery["1"] && allCall["1"] && (
          <QuerySection doc={doc} query={allQuery["1"]} call={allCall["1"]} />
        )}
      </div>
    </>
  );
}
