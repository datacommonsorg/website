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
 * Shared constants for the biomedical landing pages
 */
import { CardTheme } from "./card";

// Search url for biomedical searches
export const BIOMEDICAL_SEARCH_URL = "/explore/#";

// Query parameter for biomedical searches
export const BIOMEDICAL_SEARCH_QUERY_PARAM = "q";

// Screen breakpoints for responsive design
export const BREAKPOINTS = {
  sm: "(max-width: 599px)",
  md: "(max-width: 746px)",
  mdExpanded: "(max-width: 859px)",
  lg: "(max-width: 1440px)",
};

// CSS colors shared across landing page components
export const CSS_THEME = {
  header: {
    textColor: "#00201f",
    textColorLight: "#757575",
  },
  highlightColors: {
    dark: "#386668",
    light: "rgba(187, 236, 233, 0.1)", // main highlight with opacity 0.1
    main: "#BBECE9",
  },
  text: {
    linkColor: "#146C2E",
    textColor: "#303030",
  },
};

// Maps color theme name to card theme values
export const COLOR_TO_CARD_THEME: Record<string, CardTheme> = {
  blue: {
    tagBackgroundColor: "#C2E7FF",
    tagLabelColor: "#001D35",
    textColor: "#00639B",
  },
  green: {
    tagBackgroundColor: "#C4EED0",
    tagLabelColor: "#072711",
    textColor: "#146C2E",
  },
  mutedBlue: {
    tagBackgroundColor: "#BBECE9",
    tagLabelColor: "#00201F",
    textColor: "#386668",
  },
  red: {
    tagBackgroundColor: "#F9DEDC",
    tagLabelColor: "#410E0B",
    textColor: "#B3261E",
  },
};

// Card color theme to default to
export const DEFAULT_CARD_COLOR_THEME = "mutedBlue";
