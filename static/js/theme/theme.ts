/**
 * Theme Structure
 *
 * See: https://css-tricks.com/what-do-you-name-color-variables/
 *
 * # Constants
 *
 * - Breakpoints
 *   - [ xs, sm, md, lg, xl ]
 * - Spacing
 *   - [ xs, sm, md, lg, xl, xxl, huge, section]
 * - Colors
 *   - Text
 *     - [ primary, Beta, Gamma ]
 *       - [ Base, Light, Dark ]
 *   - Background
 *     - [ primary, Beta, Gamma ]
 *       - [ Base, Light, Dark ]
 *   - Link
 *     - [ primary, Beta, Gamma ]
 *       - [ Base, Light, Dark ]
 * - Typography
 *   - Family
 *   - Text
 *     - [ xs, sm, md, lg, xl ]
 *   - Heading
 *     - [ xs, sm, md, lg, xl ]
 *
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
  section: 80,
};

const WIDTH = {
  sm: 0,
  md: 645,
  lg: 1040,
  xl: 1310,
};

const DC_BLACK = "hsl(0, 0%, 18.82%)";
const DC_WHITE = "hsl(216, 55.6%, 98.2%)";

const DC_BLUE = "hsl(216.9, 90%, 42.9%)";
const DC_BLUE_HOVER_LIGHT = "hsl(214, 64%, 96%)";
// const DC_BLUE_HOVER_DARK = "hsl(217.3, 64.9%, 88.8%)";

const DC_BLUE_DARK = "hsl(217.4, 89.6%, 15.1%)";
const DC_BLUE_LIGHT = "hsl(218, 57.1%, 62.5%)";
const DC_BLUE_LIGHTER = "hsl(220, 100%, 98.2%)";

const theme: Theme = {
  breakpoints: BREAKPOINTS,
  spacing: SPACING,
  width: WIDTH,
  colors: {
    text: {
      primary: {
        base: DC_BLACK,
        dark: DC_BLUE_DARK,
        light: "#FFFFFF",
      },
    },
    background: {
      primary: {
        base: "#FFFFFF",
        dark: DC_BLUE_DARK,
        light: DC_BLUE_LIGHTER,
      },
    },
    link: {
      primary: {
        base: DC_BLUE,
        light: DC_BLUE_LIGHT,
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
        fontSize: "0.875",
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
      backgroundColor: DC_WHITE,
      textDecoration: "none",
      ["&:hover"]: {
        backgroundColor: DC_BLUE_HOVER_LIGHT,
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
  },
};

export default theme;
