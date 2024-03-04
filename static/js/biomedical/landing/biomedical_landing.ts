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

import { CardProps, CardTheme } from "./card";
import { CardWall } from "./card_wall";

const BIOMEDICAL_SEARCH_URL = "https://datacommons.org/explore/#q=";
const CATEGORIES_TO_THEME = {
  Ecology: "green",
  Diseases: "blue",
  Pharmacology: "red",
};

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

    default:
      // Default to 'green'
      return {
        tagBackgroundColor: "#C4EED0",
        tagLabelColor: "#072711",
        textColor: "#146C2E",
      };
  }
}

/**
 * Convert config values into card specs
 * @param config config to process
 * @param sectionName section of the config to process
 * @param addSearchUrl whether to make card url a search result
 * @returns a list of cardspecs to render
 */
function getCardSpecsFromConfig(
  config: any,
  sectionName: string,
  addSearchUrl: boolean
): CardProps[][] {
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
  return Object.values(sectionConfig);
}

window.onload = () => {
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
