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

/**
 * Main component for rendering Biomedical DC landing page.
 */
import React from "react";
import { ThemeProvider } from "styled-components";

import { CardProps } from "./card";
import {
  BIOMEDICAL_SEARCH_QUERY_PARAM,
  BIOMEDICAL_SEARCH_URL,
  COLOR_TO_CARD_THEME,
  CSS_THEME,
  DEFAULT_CARD_COLOR_THEME,
} from "./constants";
import { DataSourcesSection } from "./data_sources_section";
import { ExampleQueriesSection } from "./example_queries_section";
import { HeaderAndSearchBox } from "./header_and_search_section";
import { HighlightsSection } from "./highlights_section";
import { SampleAnalysesSection } from "./sample_analyses_section";

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
  const cards: CardProps[][] = [];
  const sectionConfig = config[sectionName] || [];
  for (const categoryConfig of sectionConfig) {
    const categoryCards = categoryConfig.cards.map((cardSpec) => {
      // Build card specs for each entry in the config
      const card: CardProps = { ...cardSpec };
      if (!cardSpec.url && addSearchUrl) {
        card.url = `${BIOMEDICAL_SEARCH_URL}${BIOMEDICAL_SEARCH_QUERY_PARAM}=${cardSpec.text}&dc=bio`;
      }
      card.tag = categoryConfig.category;
      card.theme =
        COLOR_TO_CARD_THEME[
          categoryConfig.themeColor || DEFAULT_CARD_COLOR_THEME
        ];
      return card;
    });
    cards.push(categoryCards);
  }
  return cards;
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
