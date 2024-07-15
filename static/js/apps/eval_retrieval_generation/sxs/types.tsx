/*
 Copyright 2024 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * A rater's inputs for a side-by-side eval of a single query.
 */
export interface Rating {
  leftSheetId: string;
  rightSheetId: string;
  preference: SxsPreference;
  reason?: string;
}

/**
 * Which of two answers to a query a rater preferred.
 */
export enum SxsPreference {
  LEFT = "left",
  RIGHT = "right",
  NEUTRAL = "neutral",
}
