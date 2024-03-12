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
 * Shared styling, components, and constants for the biomedical landing pages
 */

import { styled } from "styled-components";

import { CardTheme } from "./card";

// Screen breakpoints for responsive design
export const BREAKPOINTS = {
  sm: "(max-width: 599px)",
  md: "(max-width: 746px)",
  mdExpanded: "(max-width: 859px)",
  lg: "(max-width: 1440px)",
};

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
    textColor: "#303030",
  },
};

export const SectionWithBackground = styled.section`
  background: ${(props) => props.theme.highlightColors.light};
`;

export const ContentContainer = styled.div`
  color: ${(props) => props.theme.text.textColor};
  display: flex;
  flex-direction: column;
  font-size: 22px;
  font-weight: 400;
  line-height: 28px;
  margin-bottom: 22px;
  padding: 64px 15px;

  @media ${BREAKPOINTS.md} {
    font-size: 18px;
    line-height: 32px;
  }

  a {
    color: ${(props) => props.theme.highlightColors.dark};
  }

  h2 {
    color: ${(props) => props.theme.header.textColor};
    font-size: 32px;
    font-weight: 400;
    line-height: 40px;
    margin-bottom: 22px;

    @media ${BREAKPOINTS.md} {
      font-size: 24px;
      line-height: 32px;
    }
  }
`;

export const TextBlock = styled.div`
  margin-bottom: 22px;
`;

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

// Search url for biomedical searches
export const BIOMEDICAL_SEARCH_URL = "/explore/#q=";
