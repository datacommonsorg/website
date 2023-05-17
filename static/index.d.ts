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
