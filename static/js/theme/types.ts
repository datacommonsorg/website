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
 * The interface for the default Emotion theme for Data Commons
 */

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
  };
  sections: {
    compact: number;
    small: number;
    standard: number;
    large: number;
  };
  width: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  colors: {
    text?: {
      primary?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      secondary?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      tertiary?: {
        base?: string;
        light?: string;
        dark?: string;
      };
    };
    border?: {
      primary?: {
        base?: string;
        light?: string;
        dark?: string;
      };
    };
    tabs?: {
      selected?: string;
      unselected?: string;
      lining?: string;
    };
    background?: {
      primary?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      secondary?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      tertiary?: {
        base?: string;
        light?: string;
        dark?: string;
      };
    };
    button?: {
      primary?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      secondary?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      tertiary?: {
        base?: string;
        light?: string;
        dark?: string;
      };
    };
    box: {
      blue: {
        text: string;
        tag: string;
        pill: string;
      };
      green: {
        text: string;
        tag: string;
        pill: string;
      };
      red: {
        text: string;
        tag: string;
        pill: string;
      };
      yellow: {
        text: string;
        tag: string;
        pill: string;
      };
      grey: {
        text: string;
        tag: string;
        pill: string;
      };
    };
    link?: {
      primary?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      secondary?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      tertiary?: {
        base?: string;
        light?: string;
        dark?: string;
      };
    };
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
      };
      code?: {
        fontFamily: string;
        fontDisplay: string;
        fontStyle: string;
      };
    };
    // Text Variants
    text: {
      xs: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]:
          | string
          | number
          | {
              fontSize?: string;
              lineHeight?: string;
            };
      };
      sm: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]:
          | string
          | number
          | {
              fontSize?: string;
              lineHeight?: string;
            };
      };
      md: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]:
          | string
          | number
          | {
              fontSize?: string;
              lineHeight?: string;
            };
      };
      lg: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]:
          | string
          | number
          | {
              fontSize?: string;
              lineHeight?: string;
            };
      };
      xl: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]:
          | string
          | number
          | {
              fontSize?: string;
              lineHeight?: string;
            };
      };
    };
    // heading Variants
    heading: {
      xs: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]:
          | string
          | number
          | {
              fontSize?: string;
              lineHeight?: string;
            };
      };
      sm: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]:
          | string
          | number
          | {
              fontSize?: string;
              lineHeight?: string;
            };
      };
      md: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]:
          | string
          | number
          | {
              fontSize?: string;
              lineHeight?: string;
            };
      };
      lg: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]:
          | string
          | number
          | {
              fontSize?: string;
              lineHeight?: string;
            };
      };
      xl: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        [key: string]:
          | string
          | number
          | {
              fontSize?: string;
              lineHeight?: string;
            };
      };
    };
  };
  box: {
    primary?: {
      backgroundColor: string;
      textDecoration: string;
      [key: string]:
        | string
        | number
        | {
            backgroundColor: string;
          };
    };
    secondary?: {
      backgroundColor: string;
      textDecoration: string;
      [key: string]:
        | string
        | number
        | {
            backgroundColor: string;
          };
    };
    tertiary?: {
      backgroundColor: string;
      textDecoration: string;
      [key: string]:
        | string
        | number
        | {
            backgroundColor: string;
          };
    };
  };
  elevation: {
    none: {
      boxShadow: string;
    };
    primary: {
      boxShadow: string;
    };
    secondary: {
      boxShadow: string;
    };
  };
  radius: {
    none: {
      borderRadius: string;
    };
    full: {
      borderRadius: string;
    };
    primary: {
      borderRadius: string;
    };
    secondary: {
      borderRadius: string;
    };
    tertiary: {
      borderRadius: string;
    };
  };
}
