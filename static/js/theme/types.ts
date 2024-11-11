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
  width: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  colors: {
    text?: {
      alpha?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      beta?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      gamma?: {
        base?: string;
        light?: string;
        dark?: string;
      };
    };
    background?: {
      alpha?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      beta?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      gamma?: {
        base?: string;
        light?: string;
        dark?: string;
      };
    };
    button?: {
      alpha?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      beta?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      gamma?: {
        base?: string;
        light?: string;
        dark?: string;
      };
    };
    link?: {
      alpha?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      beta?: {
        base?: string;
        light?: string;
        dark?: string;
      };
      gamma?: {
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
}
