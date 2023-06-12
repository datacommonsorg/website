import "../../../../server/dist/datacommons.js";
import {
  GeoJsonData,
  GeoJsonFeatureProperties,
  MapStyle,
  MapZoomParams,
  NamedPlace,
} from "./types";

interface DataCommonsType {
  drawBar: (element: HTMLElement, props: any) => {};
  drawD3Map: (
    containerElement: HTMLDivElement,
    geoJson: GeoJsonData,
    chartHeight: number,
    chartWidth: number,
    dataValues: {
      [placeDcid: string]: number;
    },
    colorScale: d3.ScaleLinear<number | string, number>,
    redirectAction: (geoDcid: GeoJsonFeatureProperties) => void,
    getTooltipHtml: (place: NamedPlace) => string,
    canClickRegion: (placeDcid: string) => boolean,
    shouldShowBoundaryLines: boolean,
    projection: d3.GeoProjection,
    zoomDcid?: string,
    zoomParams?: MapZoomParams,
    mapStyle?: MapStyle,
  ) => {};
  drawLine: (element: HTMLElement, props: any) => {};
  drawMap: (element: HTMLElement, props: any) => {};
  drawRanking: (element: HTMLElement, props: any) => {};
  root: string;
}
declare var datacommons: DataCommonsType;

export default datacommons;
