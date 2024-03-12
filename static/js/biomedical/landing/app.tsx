/**
 * Copyright 2023 Google LLC
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

/**
 * Main component for rendering Biomedical DC landing page.
 */
import React from "react";
import { ThemeProvider } from "styled-components";

import { CardProps } from "./card";
import { DataSourcesSection } from "./data_sources_section";
import { ExampleQueriesSection } from "./example_queries_section";
import { HeaderAndSearchBox } from "./header_and_search_section";
import { HighlightsSection } from "./highlights_section";
import { SampleAnalysesSection } from "./sample_analyses_section";
import {
  BIOMEDICAL_SEARCH_URL,
  COLOR_TO_CARD_THEME,
  CSS_THEME,
  DEFAULT_CARD_COLOR_THEME,
} from "./shared";

/**
 * Defines the specs for a category of cards
 * Matches format of server/config/biomedical_landing_page/display_items.json
 */
interface CategoryConfig {
  // Name of the category, will show up as the tag on the card
  category: string;
  // Name of a color theme to apply to all cards in this category
  // Color themes defined in ./shared.tsx
  themeColor: string;
  // Specs for each card in the category
  cards: CardProps[];
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
  config: Record<string, CategoryConfig[]>,
  sectionName: string,
  addSearchUrl: boolean
): CardProps[][] {
  // Build card specs for each entry in config
  const sectionConfig = config[sectionName];
  for (const categoryConfig of sectionConfig) {
    categoryConfig.cards.forEach((cardSpec) => {
      if (!cardSpec.url && addSearchUrl) {
        cardSpec.url = `${BIOMEDICAL_SEARCH_URL}${cardSpec.text}`;
      }
      cardSpec.tag = categoryConfig.category;
      cardSpec.theme =
        COLOR_TO_CARD_THEME[
          categoryConfig.themeColor || DEFAULT_CARD_COLOR_THEME
        ];
    });
  }
  return sectionConfig.map((categoryConfig) => {
    return categoryConfig.cards;
  });
}

export function App(): JSX.Element {
  // Read config from DOM
  const config = JSON.parse(
    document.getElementById("config-data").dataset.config
  );

  return (
    <ThemeProvider theme={CSS_THEME}>
      <HeaderAndSearchBox />
      <HighlightsSection config={config["highlights"]} locale={"en"} />
      <ExampleQueriesSection
        cards={getCardSpecsFromConfig(config, "sample-questions", true)}
      />
      <SampleAnalysesSection
        cards={getCardSpecsFromConfig(config, "sample-analysis", false)}
      />
      <DataSourcesSection />
    </ThemeProvider>
  );
}
