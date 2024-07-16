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

import { GoogleSpreadsheet } from "google-spreadsheet";

export interface EvalInfo {
  question: string;
  llmStat: string;
  dcResponse: string;
  dcStat: string;
}

export interface Response {
  question: string;
  dcResponse: string;
  llmStat?: string;
}

export interface Query {
  id: number;
  text: string;
  user: string;
  row: number;
}

export interface DcCallInfo {
  rowIndex: number;
  question: string;
  llmStat: string;
  dcResponse: string;
  dcStat: string;
}

// Key is the call id, value is the data for that call from the sheet.
export type DcCalls = Record<number, DcCallInfo>;

export enum EvalType {
  RIG = "RIG",
  RAG = "RAG",
  BASELINE = "BASELINE",
}

export enum FeedbackStage {
  OVERALL_ANS = "OVERALL_ANS",
  CALLS = "CALLS",
  RAG_ANS = "RAG_ANS",
  OVERALL_QUESTIONS = "OVERALL_QUESTIONS",
  SXS = "SXS",
}

// Object to hold all the information about a google sheets document
export interface DocInfo {
  doc: GoogleSpreadsheet;
  allQuery: Record<number, Query>;
  allCall: Record<number, DcCalls>;
  evalType: EvalType;
}
