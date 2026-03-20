/**
 * Copyright 2026 Google LLC
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

import { defineMessages } from "react-intl";

/** Strings to use in the ranking page */

export const rankingMessages = defineMessages({
  pageTitle: {
    id: "ranking-page-title",
    defaultMessage:
      "Ranking by {statVarName} for {pluralPlaceType} in {placeName}",
    description:
      "Title of the page, which shows ranking of all contained places of a type within a place, where {statVarName} will be replaced by the stat var name, {pluralPlaceType} will be replaced by the place type of the contained places (could be cities, countries, counties), and {placeName} is the containing place. Please maintain the {placeName} and {pluralPlaceType} as is in the final translation, and use a gender neutral structure that conveys the same meaning (e.g. dashes to separate).",
  },
});
