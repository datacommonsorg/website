export interface PathStyle {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
}
export interface MapStyle {
  sphere?: PathStyle;
  graticule?: PathStyle;
  region?: PathStyle;
}

export interface GeoJsonFeatureProperties {
  name: string;
  geoDcid: string;
  pop?: number;
}

export type GeoJsonFeature = GeoJSON.Feature<
  GeoJSON.MultiPolygon | GeoJSON.MultiLineString,
  GeoJsonFeatureProperties
>;

export interface GeoJsonData extends GeoJSON.FeatureCollection {
  type: "FeatureCollection";
  features: Array<GeoJsonFeature>;
  properties: {
    currentGeo: string;
  };
}

export interface NamedNode {
  name: string;
  dcid: string;
}

export interface ObservationPointWithinResponse {
  data: {
    [statVarId: string]: {
      [placeDcid: string]: {
        date: string;
        facet: string;
        value: number;
      };
    };
  };
  facets: {
    [key: string]: {
      importName: string;
      measurementMethod: string;
      provenanceUrl: string;
    };
  };
}

export interface StatVar {
  definition: string;
  displayName: string;
  hasData: boolean;
  id: string;
  searchNames: string[];
}

export interface StatVarGroup {}

export interface VariableGroupInfoResponse {
  absoluteName: string;
  childStatVarGroups: StatVarGroup[];
  childStatVars?: StatVar[];
  descendentStatVarCount: number;
  parentStatVarGroups: string[];
}

export interface VariableInfoResponse {
  [dcid: string]: {
    placeTypeSummary: {
      [placeType: string]: {
        maxValue: number;
        minValue: number;
        placeCount: number;
        topPlaces: { dcid: string; name: string }[];
      };
    };
  };
}

/**
 * Information used for the zoom functionality on a map
 *
 * @param zoomInButtonId id of a button that can be clicked to zoom in
 * @param zoomOutButtonId id of a button that can be clicked to zoom out
 */
export interface MapZoomParams {
  zoomInButtonId: string;
  zoomOutButtonId: string;
}

export type NamedPlace = NamedNode;
