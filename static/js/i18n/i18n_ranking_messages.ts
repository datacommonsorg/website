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
  // The ids contain "subtitle" because they were copied from the old ranking page
  // We need to reuse the same ids to be able to reuse existing translations
  // These are used in the page title in the current UI
  allPlacesTitle: {
    id: "ranking-subtitle_all",
    defaultMessage: "All {pluralPlaceType} in {placeName}",
    description:
      "Subtitle of the page, which shows ranking of all contained places of a type within a place, where {pluralPlaceType} will be replaced by the place type of the contained places (could be cities, countries, counties), and {placeName} is the containing place. Please maintain the {placeName} and {pluralPlaceType} as is in the final translation, and use a gender neutral structure that conveys the same meaning (e.g. dashes to separate).",
  },
  allPlacesPerCapitaTitle: {
    id: "ranking-subtitle_all_percapita",
    defaultMessage: "All {pluralPlaceType} in {placeName}, per capita",
    description:
      "Subtitle of the page, which shows ranking of all contained places of a type within a place, computed on a per capita basis, where {pluralPlaceType} will be replaced by the place type of the contained places (could be cities, countries, counties), and {placeName} is the containing place. Please maintain the {placeName} and {pluralPlaceType} as is in the final translation, and use a gender neutral structure that conveys the same meaning (e.g. dashes to separate).",
  },
  topPlacesTitle: {
    id: "ranking-subtitle_top",
    defaultMessage: "Top {rankSize} {pluralPlaceType} in {placeName}",
    description:
      "Subtitle of the page, which shows ranking of the top / highest {rankSize} contained places of a type within a place, where {rankSize} will be replaced by a number, {pluralPlaceType} will be replaced by the place type of the contained places (could be cities, countries, counties), and {placeName} is the containing place. Please maintain the {rankSize}, {placeName} and {pluralPlaceType} as is in the final translation, and use a gender neutral structure that conveys the same meaning (e.g. dashes to separate).",
  },
  topPlacesPerCapita: {
    id: "ranking-subtitle_top_percapita",
    defaultMessage:
      "Top {rankSize} {pluralPlaceType} in {placeName}, per capita",
    description:
      "Subtitle of the page, which shows ranking of the top / highest {rankSize} contained places of a type within a place, computed on a per capita basis, where {rankSize} will be replaced by a number, {pluralPlaceType} will be replaced by the place type of the contained places (could be cities, countries, counties), and {placeName} is the containing place. Please maintain the {rankSize}, {placeName} and {pluralPlaceType} as is in the final translation, and use a gender neutral structure that conveys the same meaning (e.g. dashes to separate).",
  },
});
