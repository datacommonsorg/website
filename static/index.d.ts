declare module "googlemaps";
declare module "d3-geo-projection";
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
