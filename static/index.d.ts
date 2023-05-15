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
      renderRankingComponent: (element: HTMLElement, props: any) => void;
    }
  }
}
