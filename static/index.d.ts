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
    "datacommons-bar": WebComponentProps;
    "datacommons-gauge": WebComponentProps;
    "datacommons-line": WebComponentProps;
    "datacommons-map": WebComponentProps;
    "datacommons-pie": WebComponentProps;
    "datacommons-ranking": WebComponentProps;
    "datacommons-slider": WebComponentProps;
  }
}

interface WebComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  apiRoot?: string;
  barHeight?: number;
  childPlaceType?: string;
  colors?: string;
  date?: string;
  donut?: boolean;
  enclosedPlaceType?: string;
  horizontal?: boolean;
  lollipop?: boolean;
  max?: number;
  maxPlaces?: number;
  min?: number;
  parentPlace?: string;
  place?: string;
  places?: string[];
  publish?: string;
  showLowest?: boolean;
  sort?: import("./js/chart/types").SortType;
  stacked?: boolean;
  subscribe?: string;
  title?: string;
  value?: number;
  variable?: string;
  variables?: string[];
  yAxisMargin?: number;
}
