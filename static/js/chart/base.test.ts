/**
 * Copyright 2020 Google LLC
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

import { shouldFillInValues } from "./base";

test("shouldFillInValues", () => {
  let series = [
    [2000, null],
    [2001, 1],
    [2002, null],
  ];
  expect(shouldFillInValues(series)).toBe(false);

  series = [
    [2001, 1],
    [2002, 1],
    [2003, null],
  ];
  expect(shouldFillInValues(series)).toBe(false);

  series = [
    [2000, null],
    [2001, 1],
    [2002, 1],
  ];
  expect(shouldFillInValues(series)).toBe(false);

  series = [
    [2000, null],
    [2001, 1],
    [2002, 1],
    [2003, null],
  ];
  expect(shouldFillInValues(series)).toBe(false);

  series = [
    [2000, null],
    [2001, 1],
    [2002, null],
    [2003, 1],
    [2004, null],
  ];
  expect(shouldFillInValues(series)).toBe(true);

  series = [
    [2000, null],
    [2001, 1],
    [2002, 1],
    [2003, null],
    [2004, 1],
    [2005, null],
  ];
  expect(shouldFillInValues(series)).toBe(true);
});
