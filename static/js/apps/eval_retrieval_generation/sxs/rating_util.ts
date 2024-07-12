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

import { Rating, SxsPreference } from "./types";

/**
 * Checks if two ratings are equivalent.
 */
export function equivalent(r1: Rating | null, r2: Rating | null): boolean {
  return equal(r1, r2) || equal(r1, getFlipped(r2));
}

/**
 * Returns an equivalent rating with left and right sheet swapped.
 */
export function getFlipped(rating: Rating | null): Rating {
  if (!rating) return null;
  return {
    leftSheetId: rating.rightSheetId,
    preference: getReversed(rating.preference),
    reason: rating.reason,
    rightSheetId: rating.leftSheetId,
  };
}

function getReversed(preference: SxsPreference) {
  switch (preference) {
    case SxsPreference.LEFT:
      return SxsPreference.RIGHT;
    case SxsPreference.RIGHT:
      return SxsPreference.LEFT;
    case SxsPreference.NEUTRAL:
      return SxsPreference.NEUTRAL;
    default:
      throw "All preference values should be handled";
  }
}

function equal(r1: Rating | null, r2: Rating | null) {
  if (!r1 || !r2) {
    return r1 === r2;
  }
  return (
    r1.leftSheetId === r2.leftSheetId &&
    r1.rightSheetId === r2.rightSheetId &&
    r1.preference === r2.preference &&
    r1.reason === r2.reason
  );
}
