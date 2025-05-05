/**
 * Copyright 2025 Google LLC
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

//TODO(nick-next): Add language-specific tests when translations available

import { humanizeIsoDuration } from "../shared/periodicity";

test("humanizeIsoDuration with English defaults", () => {
  const cases = [
    {
      iso: "P1Y",
      expected: "Yearly",
    },
    {
      iso: "P2Y",
      expected: "Every 2 years",
    },
    {
      iso: "P1M",
      expected: "Monthly",
    },
    {
      iso: "P3M",
      expected: "Every 3 months",
    },
    {
      iso: "P1W",
      expected: "Weekly",
    },
    {
      iso: "P2W",
      expected: "Every 2 weeks",
    },
    {
      iso: "P1D",
      expected: "Daily",
    },
    {
      iso: "P5D",
      expected: "Every 5 days",
    },
    {
      iso: "PT1H",
      expected: "Hourly",
    },
    {
      iso: "PT6H",
      expected: "Every 6 hours",
    },
    {
      iso: "PT1M",
      expected: "Every minute",
    },
    {
      iso: "PT30M",
      expected: "Every 30 minutes",
    },
    {
      iso: "PT1S",
      expected: "Every second",
    },
    {
      iso: "PT45S",
      expected: "Every 45 seconds",
    },
    {
      iso: "P1Y2M",
      expected: "Every 1 year and 2 months",
    },
    {
      iso: "P2Y3M",
      expected: "Every 2 years and 3 months",
    },
    {
      iso: "P1Y1M1D",
      expected: "Every 1 year, 1 month and 1 day",
    },
    {
      iso: "P1Y2M3D",
      expected: "Every 1 year, 2 months and 3 days",
    },
    {
      iso: "PT1H30M",
      expected: "Every 1 hour and 30 minutes",
    },
    {
      iso: "P1Y1M1DT1H1M1S",
      expected: "Every 1 year, 1 month, 1 day, 1 hour, 1 minute and 1 second",
    },
    {
      iso: "P2Y3M4DT5H6M7S",
      expected:
        "Every 2 years, 3 months, 4 days, 5 hours, 6 minutes and 7 seconds",
    },
    {
      iso: "invalid",
      expected: "invalid",
    },
  ];

  for (const c of cases) {
    const text = humanizeIsoDuration(c.iso);
    expect(text).toEqual(c.expected);
  }
});
