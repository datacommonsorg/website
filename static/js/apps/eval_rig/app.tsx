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
import { Query, QuerySection } from "./query_section";

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

  const loadQuery = (doc: GoogleSpreadsheet) => {
    doc.loadInfo().then(() => {
      const qaSheet = doc.sheetsByTitle["query_and_answer"];
      const qaRows = qaSheet.rowCount;
      qaSheet
        .loadCells({
          startRowIndex: 1,
          endRowIndex: qaRows,
          startColumnIndex: 0,
          endColumnIndex: 3,
        })
        .then(() => {
          const allQuery: Record<string, Query> = {};
          for (let i = 1; i < qaRows; i++) {
            allQuery[qaSheet.getCell(i, 0).value as string] = {
              rowIdx: i,
              text: qaSheet.getCell(i, 2).value as string,
              user: qaSheet.getCell(i, 1).value as string,
            };
          }
          setAllQuery(allQuery);
        });
    });
  };

  const loadCall = (doc: GoogleSpreadsheet) => {
    doc.loadInfo().then(() => {
      const callSheet = doc.sheetsByTitle["dc_calls"];
      const callRows = callSheet.rowCount;
      callSheet
        .loadCells({
          startRowIndex: 1,
          endRowIndex: callRows,
          startColumnIndex: 0,
          endColumnIndex: 2,
        })
        .then(() => {
          const allCall: Record<string, Record<string, number>> = {};
          for (let i = 1; i < callRows; i++) {
            const rowIdx = i;
            const queryId = callSheet.getCell(i, 0).value as string;
            const callId = callSheet.getCell(i, 1).value as string;
            if (!allCall[queryId]) {
              allCall[queryId] = {};
            }
            allCall[queryId][callId] = rowIdx;
          }
          setAllCall(allCall);
        });
    });
  };

  const handleUserSignIn = (user: User, credential: OAuthCredential) => {
    if (credential.accessToken) {
      setUser(user); // Set the user state to the signed-in user
      const doc = new GoogleSpreadsheet(props.sheetId, {
        token: credential.accessToken,
      });
      setDoc(doc);
      loadQuery(doc);
      loadCall(doc);
    }
  };

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
