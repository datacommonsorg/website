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
 * The default Emotion theme for Data Commons
 */

import { Theme } from "./types";

const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 1068,
  xl: 1350,
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  huge: 64,
};

const SECTIONS = {
  compact: 0,
  small: 32,
  standard: 64,
  large: 110,
};

const WIDTH = {
  xs: 0,
  sm: 645,
  md: 750,
  lg: 1040,
  xl: 1310,
};

const ICONS = {
  xs: 12,
  sm: 18,
  md: 24,
  lg: 32,
  xl: 48,
};

const DC_BLACK = "hsl(0, 0%, 18.82%)";

const DC_BLACK_00 = "hsl(0, 0.00%, 0%)";
const DC_BLACK_10 = "hsl(0, 0.00%, 10%)";
const DC_BLACK_20 = "hsl(0, 0.00%, 20%)";
const DC_BLACK_30 = "hsl(0, 0.00%, 30%)";
const DC_BLACK_40 = "hsl(0, 0.00%, 40%)";
const DC_BLACK_50 = "hsl(0, 0.00%, 50%)";
const DC_BLACK_60 = "hsl(0, 0.00%, 60%)";
const DC_BLACK_70 = "hsl(0, 0.00%, 70%)";
const DC_BLACK_80 = "hsl(0, 0.00%, 80%)";
const DC_BLACK_90 = "hsl(0, 0.00%, 90%)";

const DC_WHITE = "hsl(255, 100%, 100%)";
const DC_BONE = "hsl(216, 55%, 98%)";

const DC_BLUE = "hsl(217, 90%, 43%)";
const DC_BLUE_DARK = "hsl(217, 90%, 15%)";
const DC_BLUE_LIGHT = "hsl(218, 57%, 63%)";
const DC_BLUE_LIGHTER = "hsl(204, 100%, 88%)";
const DC_BLUE_WHITE = "hsl(220, 100%, 98%)";

const DC_BLUE_PILL_TEXT = "hsl(217, 90%, 15%)";
const DC_BLUE_PILL_BCKG = "hsl(218, 92%, 95%)";
const DC_BLUE_PILL_BCKG_HOVER = "hsl(204, 90%, 80%)";

const DC_GREEN = "hsl(137, 68%, 25%)";
const DC_GREEN_PILL_TEXT = "hsl(139, 70%, 9%)";
const DC_GREEN_PILL_BCKG = "hsl(137, 55%, 85%)";

const DC_RED = "hsl(3, 71%, 41%)";
const DC_RED_PILL_TEXT = "hsl(3, 71%, 15%)";
const DC_RED_PILL_BCKG = "hsl(4, 71%, 92%)";

const DC_YELLOW = "hsl(35, 100%, 29%)";
const DC_YELLOW_PILL_TEXT = "hsl(3, 71%, 15%)";
const DC_YELLOW_PILL_BCKG = "hsl(40, 100%, 91%)";

const DC_GRAY = "hsl(160, 2%, 27%)";
const DC_GRAY_LINING = "hsl(140, 3%, 77%)";
const DC_GRAY_TOOLTIP = "hsl(213, 43%, 96%)";

const DC_GRAY_PILL_TEXT = DC_YELLOW;
const DC_GRAY_PILL_BCKG = "hsl(240, 29%, 91%)";

const theme: Theme = {
  breakpoints: BREAKPOINTS,
  spacing: SPACING,
  sections: SECTIONS,
  width: WIDTH,
  colors: {
    text: {
      primary: {
        base: DC_BLACK,
        dark: DC_BLUE_DARK,
        light: DC_WHITE,
      },
      secondary: {
        base: DC_GRAY,
        dark: DC_BLACK_80,
        light: DC_GRAY_PILL_BCKG,
      },
    },
    background: {
      primary: {
        base: DC_WHITE,
        dark: DC_BLUE_DARK,
        light: DC_BLUE_WHITE,
      },
      secondary: {
        base: DC_BONE,
        dark: DC_GRAY,
        light: DC_BLUE_WHITE,
      },
    },
    border: {
      primary: {
        base: DC_WHITE,
        dark: DC_BLUE_DARK,
        light: DC_BLACK_80,
      },
    },
    tabs: {
      selected: DC_BLUE,
      unselected: DC_BLACK_30,
      lining: DC_GRAY_LINING,
    },
    box: {
      blue: {
        text: DC_BLUE,
        tag: DC_BLUE_PILL_TEXT,
        pill: DC_BLUE_PILL_BCKG,
      },
      green: {
        text: DC_GREEN,
        tag: DC_GREEN_PILL_TEXT,
        pill: DC_GREEN_PILL_BCKG,
      },
      red: {
        text: DC_RED,
        tag: DC_RED_PILL_TEXT,
        pill: DC_RED_PILL_BCKG,
      },
      yellow: {
        text: DC_YELLOW,
        tag: DC_YELLOW_PILL_TEXT,
        pill: DC_YELLOW_PILL_BCKG,
      },
      grey: {
        text: DC_GRAY,
        tag: DC_GRAY_PILL_TEXT,
        pill: DC_GRAY_PILL_BCKG,
      },
      tooltip: {
        text: DC_GRAY,
        tag: DC_BLUE,
        pill: DC_GRAY_TOOLTIP,
      },
    },
    link: {
      primary: {
        base: DC_BLUE,
        light: DC_BLUE_LIGHT,
        dark: DC_BLUE_DARK,
      },
      secondary: {
        base: DC_GRAY,
        light: DC_BLACK_80,
        dark: DC_BLACK,
      },
    },
    button: {
      primary: {
        base: DC_BLUE,
        light: DC_BLUE_LIGHT,
        dark: DC_BLUE_DARK,
      },
    },
  },
  typography: {
    family: {
      text: {
        fontFamily: "'Google Sans Text', Arial, sans-serif",
        fontStyle: "normal",
      },
      heading: {
        fontFamily: "'Google Sans', Arial, sans-serif",
        fontStyle: "normal",
      },
    },
    text: {
      xs: {
        fontSize: "0.75rem",
        lineHeight: "0.625rem",
        fontWeight: 400,
      },
      sm: {
        fontSize: "0.875rem",
        lineHeight: "1.25rem",
        fontWeight: 400,
      },
      md: {
        fontSize: "1rem",
        lineHeight: "1.5rem",
        fontWeight: 400,
      },
      lg: {
        fontSize: "1.375rem",
        lineHeight: "1.75rem",
        fontWeight: 400,
        [`@media (max-width: ${BREAKPOINTS.sm}px)`]: {
          fontSize: "1rem",
          lineHeight: "1.5rem",
        },
      },
      xl: {
        fontSize: "1.5rem",
        lineHeight: "2rem",
        fontWeight: 400,
        [`@media (max-width: ${BREAKPOINTS.sm}px)`]: {
          fontSize: "1.375rem",
          lineHeight: "1.75rem",
        },
      },
    },
    heading: {
      xs: {
        fontSize: "1.375rem",
        lineHeight: "1.75rem",
        fontWeight: 300,
      },
      sm: {
        fontSize: "1.75rem",
        lineHeight: "2.25rem",
        fontWeight: 300,
        [`@media (max-width: ${BREAKPOINTS.md}px)`]: {
          fontSize: "1.5rem",
          lineHeight: "2rem",
        },
      },
      md: {
        fontSize: "2rem",
        lineHeight: "2.5rem",
        fontWeight: 300,
        [`@media (max-width: ${BREAKPOINTS.md}px)`]: {
          fontSize: "1.7rem",
          lineHeight: "2.25rem",
        },
      },
      lg: {
        fontSize: "2.25rem",
        lineHeight: "2.75rem",
        fontWeight: 300,
        [`@media (max-width: ${BREAKPOINTS.md}px)`]: {
          fontSize: "1.8rem",
          lineHeight: "2.4rem",
        },
      },
      xl: {
        fontSize: "3rem",
        lineHeight: "2.75rem",
        fontWeight: 300,
        [`@media (max-width: ${BREAKPOINTS.md}px)`]: {
          fontSize: "2.4rem",
          lineHeight: "2.75rem",
        },
      },
    },
  },
  box: {
    primary: {
      backgroundColor: DC_BONE,
      textDecoration: "none",
      ["&:hover:not(:disabled)"]: {
        backgroundColor: DC_BLUE_PILL_BCKG,
      },
    },
    secondary: {
      backgroundColor: DC_BLUE_LIGHTER,
      textDecoration: "none",
      ["&:hover:not(:disabled)"]: {
        backgroundColor: DC_BLUE_PILL_BCKG_HOVER,
      },
    },
  },
  button: {
    type: {
      primary: {
        color: DC_BLUE,
        backgroundColor: DC_WHITE,
        border: `1px solid ${DC_BLACK_70}`,
        ["&:hover:not(:disabled):not([aria-disabled])"]: {
          backgroundColor: DC_WHITE,
          color: DC_BLUE,
          border: `1px solid ${DC_BLUE}`,
        },
      },
      secondary: {
        color: DC_BLUE,
        backgroundColor: DC_BLUE_LIGHTER,
        border: `1px solid ${DC_BLUE_LIGHTER}`,
        ["&:hover:not(:disabled):not([aria-disabled])"]: {
          backgroundColor: DC_BLUE_LIGHTER,
          color: DC_BLUE,
          border: `1px solid ${DC_BLUE}`,
        },
      },
      tertiary: {
        color: DC_BLUE,
        backgroundColor: "transparent",
        border: `1px solid transparent`,
        ["&:hover:not(:disabled):not([aria-disabled])"]: {
          backgroundColor: "transparent",
          color: DC_BLUE,
          border: `1px solid ${DC_BLUE}`,
        },
      },
    },
    size: {
      sm: {
        padding: `6px ${SPACING.md}px`,
      },
      md: {
        padding: `11px ${SPACING.md}px 9px`,
      },
      lg: {
        padding: `15px ${SPACING.lg}px`,
      },
    },
  },
  elevation: {
    none: {
      boxShadow: "none",
    },
    primary: {
      boxShadow:
        "0px 1px 2px hsla(0, 0%, 0%, 0.3), 0px 1px 3px 1px hsla(0, 0%, 0%, 0.15)",
    },
    secondary: {
      boxShadow: "0 2px 5px hsla(0,0%,0%,0.1)",
    },
  },
  radius: {
    none: {
      borderRadius: "0",
    },
    full: {
      borderRadius: "1000px",
    },
    primary: {
      borderRadius: "32px",
    },
    secondary: {
      borderRadius: "20px",
    },
    tertiary: {
      borderRadius: "12px",
    },
    quaternary: {
      borderRadius: "8px",
    },
  },
  zIndex: {
    primary: 9999,
    secondary: 999,
    tertiary: 99,
  },
  tooltip: {
    width: "300px",
  },
};

export default theme;
