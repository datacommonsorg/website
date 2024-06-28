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

// Check the firestore rules in https://firebase.corp.google.com/project/datcom-website-autopush/firestore/databases/-default-/rules

import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import {
  GoogleSpreadsheet,
  GoogleSpreadsheetRow,
  GoogleSpreadsheetWorksheet,
} from "google-spreadsheet";
import _ from "lodash";

import { db } from "../../utils/firebase";
import {
  CALL_ID_COL,
  DC_FEEDBACK_SHEET,
  QUERY_ID_COL,
  USER_COL,
} from "./constants";
import { Response } from "./types";

// Gets the document path for a specific query or call
export function getPath(
  sheetId: string,
  queryId?: number,
  callId?: number
): string {
  const path = ["sheets", sheetId];
  if (queryId) {
    path.push(...["queries", String(queryId)]);
  }
  if (callId) {
    path.push(...["calls", String(callId)]);
  }
  return path.join("/");
}

// Sets a field in a doc at the specified path
export async function setFields(
  path: string,
  fields: Record<string, string>
): Promise<void> {
  const docRef = doc(db, path);
  setDoc(docRef, fields, { merge: true });
}

// Gets all the fields for a specified path
export async function getAllFields(path: string): Promise<DocumentData> {
  const docRef = doc(db, path);
  const snapshot = await getDoc(docRef);
  return snapshot.data() || {};
}

// Gets a field from a doc at the specified path
export async function getField(
  path: string,
  fieldKey: string
): Promise<string> {
  const docData = await getAllFields(path);
  return docData ? docData[fieldKey] : "";
}

// Add a new doc for a call
async function addCallToStore(
  sheetId: string,
  queryId: number,
  callId: number
): Promise<void> {
  const docRef = doc(
    db,
    "sheets",
    sheetId,
    "queries",
    String(queryId),
    "calls",
    String(callId)
  );
  // Need to set a field in order to create the document
  setDoc(docRef, { id: callId }, { merge: true });
}

// Save response to Firestore
export async function saveToStore(
  userEmail: string,
  sheetId: string,
  queryId: number,
  callId: number,
  response: Response
): Promise<void> {
  await addCallToStore(sheetId, queryId, callId);
  const docRef = collection(
    db,
    "sheets",
    sheetId,
    "queries",
    String(queryId),
    "calls",
    String(callId),
    "responses"
  );
  const savedResponse = { ...response, userEmail, timestamp: new Date() };
  addDoc(docRef, savedResponse);
}

export async function getCallData(
  sheetId: string,
  queryId: number,
  callId: number
): Promise<DocumentData | null> {
  console.log("database: get call data");
  // Define the document reference
  const collectionRef = collection(
    db,
    "sheets",
    sheetId,
    "queries",
    String(queryId),
    "calls",
    String(callId),
    "responses"
  );
  // Get the latest response.
  const snapshot = await getDocs(
    query(collectionRef, orderBy("timestamp", "desc"))
  );
  const numDocs = snapshot.docs.length;
  if (numDocs === 0) {
    return null;
  }
  return snapshot.docs[0].data();
}

export async function saveToSheet(
  userEmail: string,
  doc: GoogleSpreadsheet,
  queryId: number,
  callId: number,
  cellValues: Record<string, string | number>
): Promise<void> {
  const sheet = doc.sheetsByTitle[DC_FEEDBACK_SHEET];
  sheet.addRow({
    ...cellValues,
    [QUERY_ID_COL]: queryId,
    [CALL_ID_COL]: callId,
    [USER_COL]: userEmail,
  });
}

/**
 * Gets the number of calls for a query
 * @param sheetId the sheet id
 * @param queryId the query id
 */
export async function getCallCount(
  sheetId: string,
  queryId: number
): Promise<number> {
  // Define the document reference
  const collectionRef = collection(
    db,
    "sheets",
    sheetId,
    "queries",
    String(queryId),
    "calls"
  );
  const snapshot = await getCountFromServer(collectionRef);
  return snapshot.data().count;
}

/**
 * Returns a promise to get a record of row idx to google sheet row
 * @param sheet the sheet to get rows from
 * @param rowIdxList the list of rows to get from the sheet
 */
export async function getSheetsRows(
  sheet: GoogleSpreadsheetWorksheet,
  rowIdxList: number[]
): Promise<Record<number, GoogleSpreadsheetRow>> {
  if (_.isEmpty(rowIdxList)) {
    return Promise.resolve({});
  }
  rowIdxList.sort((a, b) => a - b);
  const firstRowIdx = rowIdxList[0];
  return sheet
    .getRows({
      offset: firstRowIdx - 1,
      limit: rowIdxList[rowIdxList.length - 1] - firstRowIdx + 1,
    })
    .then((rows) => {
      const result = {};
      rows.forEach((row, i) => {
        result[firstRowIdx + i] = row;
      });
      return result;
    });
}
