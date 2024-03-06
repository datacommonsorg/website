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

/** Entrypoint for Biomedical DC Landing Page */

import React from "react";
import ReactDOM from "react-dom";

import { BiomedicalSearchBox } from "./biomedical_search_box";
import { CardProps, CardTheme } from "./card";
import { CardWall } from "./card_wall";

// Search url for biomedical searches
const BIOMEDICAL_SEARCH_URL = "/explore/#q=";

// Mapping of categories to color theme to apply to cards in that category
const CATEGORIES_TO_THEME = {
  Diseases: "blue",
  Ecology: "muted-blue",
  Pharmacology: "red",
};

// Order to show card categories in, from left to right
const CARD_CATEGORY_ORDER = ["Ecology", "Diseases", "Pharmacology"];

// Starting text in the search box
const SEARCH_BOX_PLACEHOLDER_TEXT =
  "E.g. What disease are the following genetic variances associated with? rs7903146, rs2237897, rs4712524, rs6769511, rs5219";

/**
 * Get colors to apply to a Card as a theme, based on name of theme
 * @param themeName text name of the theme to apply
 * @returns CardTheme matching the theme name
 */
function getColorTheme(themeName: string): CardTheme {
  switch (themeName) {
    case "red":
      return {
        tagBackgroundColor: "#F9DEDC",
        tagLabelColor: "#410E0B",
        textColor: "#B3261E",
      };

    case "blue":
      return {
        tagBackgroundColor: "#C2E7FF",
        tagLabelColor: "#001D35",
        textColor: "#00639B",
      };

    case "green":
      return {
        tagBackgroundColor: "#C4EED0",
        tagLabelColor: "#072711",
        textColor: "#146C2E",
      };

    default:
      // default to "muted-blue"
      return {
        tagBackgroundColor: "#BBECE9",
        tagLabelColor: "#00201F",
        textColor: "#386668",
      };
  }
}

/**
 * Convert config values into CardProps to render in a CardWall
 * @param config config to process, maps page section -> card category -> cards
 * @param sectionName page section of the config to process
 * @param addSearchUrl whether to make the card's text a biomedical search query
 *                     when clicked
 * @returns a grid of CardProps to render on the page
 */
function getCardSpecsFromConfig(
  config: Record<string, Record<string, CardProps[]>>,
  sectionName: string,
  addSearchUrl: boolean
): CardProps[][] {
  // Build card specs for each entry in config
  const sectionConfig = config[sectionName];
  for (const category in sectionConfig) {
    sectionConfig[category].forEach((cardSpec) => {
      if (!cardSpec.url && addSearchUrl) {
        cardSpec.url = `${BIOMEDICAL_SEARCH_URL}${cardSpec.text}`;
      }
      cardSpec.tag = category;
      cardSpec.theme = getColorTheme(CATEGORIES_TO_THEME[category]);
    });
  }
  // Return cards in order by category
  const categoriesInOrder = Object.keys(sectionConfig).sort((a, b) => {
    return CARD_CATEGORY_ORDER.indexOf(a) - CARD_CATEGORY_ORDER.indexOf(b);
  });
  return categoriesInOrder.map((category) => sectionConfig[category]);
}

window.onload = () => {
  // Render search box
  ReactDOM.render(
    React.createElement(BiomedicalSearchBox, {
      onSearch: (query) => {
        window.location.href = `${BIOMEDICAL_SEARCH_URL}${query}`;
      },
      placeholderText: SEARCH_BOX_PLACEHOLDER_TEXT,
    }),
    document.getElementById("biomedical-search-container")
  );

  // Read config from DOM
  const config = JSON.parse(
    document.getElementById("config-data").dataset.config
  );

  // Render cards for the sample questions
  const questionCards = getCardSpecsFromConfig(
    config,
    "sample-questions",
    true
  );
  ReactDOM.render(
    React.createElement(CardWall, {
      cards: questionCards,
      direction: "column",
    }),
    document.getElementById("sample-questions-card-container")
  );

  // Render cards for the sample analyses
  const analysesCards = getCardSpecsFromConfig(
    config,
    "sample-analysis",
    false
  );
  ReactDOM.render(
    React.createElement(CardWall, {
      cards: analysesCards,
      direction: "row",
    }),
    document.getElementById("sample-analysis-card-container")
  );
};
