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
  * - Colors
  *   - Text
  *     - [ Alpha, Beta, Gamma ]
  *       - [ Base, Light, Dark ]
  *   - Background
  *     - [ Alpha, Beta, Gamma ]
  *       - [ Base, Light, Dark ]
  *   - Link
  *     - [ Alpha, Beta, Gamma ]
  *       - [ Base, Light, Dark ]
  * - Typography
  *   - Family
  *   - Text
  *     - [ xs, sm, md, lg, xl ]
  *   - Heading
  *     - [ xs, sm, md, lg, xl ]
  * 
*/

const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 1068,
  xl: 1350,
}

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  huge: 64,
  section: 80,
}

const DC_BLACK = "#303030";
const DC_BLUE_DARK = "#041E49";
const DC_BLUE_LIGHT = "#6991D6";

export interface Theme {
  breakpoints: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    huge: number;
    section: number;
  };
  colors: {
    text?: {
      alpha?: {
        base?: string;
        light?: string;
        dark?: string;
      }
      beta?: {
        base?: string;
        light?: string;
        dark?: string;
      }
      gamma?: {
        base?: string;
        light?: string;
        dark?: string;
      }
    };
    background?: {
      alpha?: {
        base?: string;
        light?: string;
        dark?: string;
      }
      beta?: {
        base?: string;
        light?: string;
        dark?: string;
      }
      gamma?: {
        base?: string;
        light?: string;
        dark?: string;
      }
    };
    button?: {
      alpha?: {
        base?: string;
        light?: string;
        dark?: string;
      }
      beta?: {
        base?: string;
        light?: string;
        dark?: string;
      }
      gamma?: {
        base?: string;
        light?: string;
        dark?: string;
      }
    }
    link?: {
      alpha?: {
        base?: string;
        light?: string;
        dark?: string;
      }
      beta?: {
        base?: string;
        light?: string;
        dark?: string;
      }
      gamma?: {
        base?: string;
        light?: string;
        dark?: string;
      }
    }
  };
  typography: {
    family: {
      text: {
        fontFamily: string;
        fontDisplay: string;
        fontStyle: string;
      };
      heading: {
        fontFamily: string;
        fontDisplay: string;
        fontStyle: string;
      };
      extra?: {
        fontFamily: string;
        fontDisplay: string;
        fontStyle: string;
      }
      code?: {
        fontFamily: string;
        fontDisplay: string;
        fontStyle: string;
      }
    }
    // Text Variants
    text: {
      xs: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]: string | number | {
          fontSize?: string;
          lineHeight?: string;
        };
      };
      sm: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]: string | number | {
          fontSize?: string;
          lineHeight?: string;
        };
      };
      md: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]: string | number | {
          fontSize?: string;
          lineHeight?: string;
        };
      };
      lg: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]: string | number | {
          fontSize?: string;
          lineHeight?: string;
        };
      };
      xl: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]: string | number | {
          fontSize?: string;
          lineHeight?: string;
        };
      };
    }
    // heading Variants
    heading: {
      xs: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]: string | number | {
          fontSize?: string;
          lineHeight?: string;
        };
      };
      sm: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]: string | number | {
          fontSize?: string;
          lineHeight?: string;
        };
      };
      md: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]: string | number | {
          fontSize?: string;
          lineHeight?: string;
        };
      };
      lg: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]: string | number | {
          fontSize?: string;
          lineHeight?: string;
        };
      };
      xl: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]: string | number | {
          fontSize?: string;
          lineHeight?: string;
        };
      };
    }
  };
}

const theme: Theme = {
  breakpoints: BREAKPOINTS,
  spacing: SPACING,
  colors: {
    text: {
      alpha: {
        base: "red",
        light: "white",
      },
    },
    background: {
      alpha: {
        dark: DC_BLUE_DARK,
      },
    },
    link: {
      alpha: {
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
        }
      },
      xl: {
        fontSize: "1.5rem",
        lineHeight: "2rem",
        fontWeight: 400,
        [`@media (max-width: ${BREAKPOINTS.sm}px)`]: {
          fontSize: "1.375rem",
          lineHeight: "1.75rem",
        }
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
        }
      },
    }
  },
};

export default theme;
