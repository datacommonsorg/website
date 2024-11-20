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
  standard: 48,
  large: 110,
};

const WIDTH = {
  sm: 0,
  md: 645,
  lg: 1040,
  xl: 1310,
};

const DC_BLACK = "hsl(0, 0%, 18.82%)";
const DC_WHITE = "hsl(255, 100%, 100%)";
const DC_BONE = "hsl(216, 55.6%, 98.2%)";

const DC_BLUE = "hsl(216.9, 90%, 42.9%)";
const DC_BLUE_PILL_TEXT = "hsl(217.4, 89.6%, 15.1%)";
const DC_BLUE_PILL_BCKG = "hsl(218.2, 91.7%, 95.3%)";

const DC_BLUE_DARK = "hsl(217.4, 89.6%, 15.1%)";
const DC_BLUE_LIGHT = "hsl(218, 57.1%, 62.5%)";
const DC_BLUE_LIGHTER = "hsl(203.6, 100%, 88%)";
const DC_BLUE_WHITE = "hsl(220, 100%, 98.2%)";

const DC_GREEN = "hsl(137.7, 68.8%, 25.1%)";
const DC_GREEN_PILL_TEXT = "hsl(138.8, 69.6%, 9%)";
const DC_GREEN_PILL_BCKG = "hsl(137.1, 55.3%, 85.1%)";

const DC_RED = "hsl(3.2, 71.3%, 41%)";
const DC_RED_PILL_TEXT = "hsl(3.3, 71.1%, 14.9%)";
const DC_RED_PILL_BCKG = "hsl(4.1, 70.7%, 92%)";

const DC_YELLOW = "hsl(35.3, 100%, 29%)";
const DC_YELLOW_PILL_TEXT = "hsl(3.3, 71.1%, 14.9%)";
const DC_YELLOW_PILL_BCKG = "hsl(40.4, 100%, 91%)";

const DC_GRAY = "hsl(160, 2.2%, 27.3%)";
const DC_GRAY_PILL_TEXT = DC_YELLOW;
const DC_GRAY_PILL_BCKG = "hsl(240, 20.8%, 90.6%)";

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
    },
    background: {
      primary: {
        base: DC_WHITE,
        dark: DC_BLUE_DARK,
        light: DC_BLUE_WHITE,
      },
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
    },
    link: {
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
        fontDisplay: "swap",
        fontStyle: "normal",
      },
      heading: {
        fontFamily: "'Google Sans', Arial, sans-serif",
        fontDisplay: "swap",
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
      },
      md: {
        fontSize: "2rem",
        lineHeight: "2.5rem",
        fontWeight: 300,
      },
      lg: {
        fontSize: "2.25rem",
        lineHeight: "2.75rem",
        fontWeight: 300,
      },
      xl: {
        fontSize: "2.25rem",
        lineHeight: "2.75rem",
        fontWeight: 300,
        [`@media (max-width: ${BREAKPOINTS.sm}px)`]: {
          fontSize: "1.375rem",
          lineHeight: "1.75rem",
        },
      },
    },
  },
  box: {
    primary: {
      backgroundColor: DC_BONE,
      textDecoration: "none",
      ["&:hover"]: {
        backgroundColor: DC_BLUE_PILL_BCKG,
      },
    },
    secondary: {
      backgroundColor: DC_BLUE_PILL_BCKG,
      textDecoration: "none",
      ["&:hover"]: {
        backgroundColor: DC_BLUE_LIGHTER,
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
    primary: {
      borderRadius: "32px",
    },
    secondary: {
      borderRadius: "20px",
    },
  },
};

export default theme;
