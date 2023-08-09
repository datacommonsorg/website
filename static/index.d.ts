declare module "googlemaps";

// Set new property gtag on window.
declare module "google-analytics" {
  global {
    interface Window {
      gtag: (
        event: string,
        eventName: string,
        parameter: Record<string, string | string[]>
      ) => void;
    }
  }
}

declare module "datacommons" {
  global {
    interface datacommons {
      root: string;
      drawRanking: (element: HTMLElement, props: unknown) => void;
    }
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    "datacommons-bar": import("./library/component_attributes").BarComponentProps;
    "datacommons-gauge": import("./library/component_attributes").GaugeComponentProps;
    "datacommons-highlight": import("./library/component_attributes").HighlightComponentProps;
    "datacommons-line": import("./library/component_attributes").LineComponentProps;
    "datacommons-map": import("./library/component_attributes").MapComponentProps;
    "datacommons-pie": import("./library/component_attributes").PieComponentProps;
    "datacommons-ranking": import("./library/component_attributes").RankingComponentProps;
    "datacommons-slider": import("./library/component_attributes").SliderComponentProps;
  }
}
