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

export interface EvalInfo {
  question: string;
  llmStat: string;
  dcResponse: string;
  dcStat: string;
}

export interface Response {
  question: string;
  llmStat: string;
  dcResponse: string;
}

export interface Query {
  id: number;
  text: string;
  user: string;
  row: number;
}

// Key is the call id, value is the row index in the sheet.
export type DcCall = Record<number, number>;

export enum EvalType {
  RIG = "RIG",
  RAG = "RAG",
}
