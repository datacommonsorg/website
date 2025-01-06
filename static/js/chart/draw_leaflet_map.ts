/**
 * Copyright 2022 Google LLC
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
 * functions for drawing a leaflet map.
 */

import * as d3 from "d3";
import geoblaze from "geoblaze";
import GeoRasterLayer, { GeoRaster } from "georaster-layer-for-leaflet";
import L, { LatLng, Layer, Map } from "leaflet";

import { USA_PLACE_DCID } from "../shared/constants";
import { getPlacePathId } from "./draw_map_utils";
import { GeoJsonData } from "./types";

// TODO: get the NO_DATA_VALUE, GEORASTER_DATA_BAND, MAP CENTER, and MAP ZOOM
// from API
// The value used in the geotiff when there is no data at that point.
const NO_DATA_VALUE = -9999;
// GeoTIFFs can have multiple bands holding different values. This is the band
// that holds the data values.
const GEORASTER_DATA_BAND = 0;
// map of place dcid to the lat long center of that place.
const MAP_OPTIMAL_CENTER = {
  [USA_PLACE_DCID]: new L.LatLng(39.82, -98.58),
};
// map of place dcid to the optimal zoom when rendering maps of that place.
const MAP_OPTIMAL_ZOOM = {
  [USA_PLACE_DCID]: 4,
};
const DEFAULT_MAP_CENTER = new L.LatLng(39.82, -98.58);
const DEFAULT_MAP_ZOOM = 4;
const GEOJSON_STYLE = { fillColor: "transparent", weight: 0.5, color: "white" };
const GEOJSON_HIGHLIGHTED_STYLE = {
  weight: 2,
  color: "#666",
  fillOpacity: 0.7,
};

function updateTooltip(
  geoRaster: GeoRaster,
  tooltipLayer: Layer,
  latLng: LatLng,
  placeName?: string
): void {
  const val = geoblaze.identify(geoRaster, [latLng.lng, latLng.lat]);
  if (val && val.length > GEORASTER_DATA_BAND) {
    tooltipLayer.setTooltipContent(
      `${placeName ? placeName + ": " : ""}${val[GEORASTER_DATA_BAND]}`
    );
    tooltipLayer.openTooltip(latLng);
  } else {
    tooltipLayer.closeTooltip();
  }
}

/**
 * Sets the optimal leaflet map view for the selected place
 * @param leafletMap
 * @param selectedPlaceDcid
 */
export function setOptimalMapView(
  leafletMap: Map,
  selectedPlaceDcid: string
): void {
  const center = MAP_OPTIMAL_CENTER[selectedPlaceDcid] || DEFAULT_MAP_CENTER;
  const zoom = MAP_OPTIMAL_ZOOM[selectedPlaceDcid] || DEFAULT_MAP_ZOOM;
  leafletMap.setView(center, zoom);
}

/**
 * Adds a geotiff layer to the leaflet map. The colors of the geotiff will be
 * calculated using the GEORASTER_DATA_BAND band in the geotiff and the
 * colorscale.
 * @param leafletMap base leaflet map
 * @param geoRaster the geoRaster (geotiff) to render
 * @param colorScale the colorscale to use to color the geotiff pixels
 */
export function addGeotiffLayer(
  leafletMap: Map,
  geoRaster: GeoRaster,
  colorScale: d3.ScaleLinear<number, number>
) {
  const geotiffLayer = new GeoRasterLayer({
    georaster: geoRaster,
    opacity: 1,
    pixelValuesToColorFn: (value) => {
      if (value[GEORASTER_DATA_BAND] === NO_DATA_VALUE) {
        return null;
      } else {
        return colorScale(value[GEORASTER_DATA_BAND]) as unknown as string;
      }
    },
  })
    .bindTooltip("")
    .addTo(leafletMap);

  leafletMap.on("mousemove", (e) => {
    updateTooltip(geoRaster, geotiffLayer, e.latlng);
  });
  return geotiffLayer;
}

/**
 * Adds a geojson layer to a leaflet map. The geojson layer will show the
 * borders of the places in the geojson.
 * @param leafletMap base leaflet map
 * @param geojson the geojson data to render
 * @param geotiffLayer geotiffLayer on the leaflet map if there is one
 * @param geoRaster geoRaster (geotiff) data
 */
export function addGeoJsonLayer(
  leafletMap: Map,
  geojson: GeoJsonData,
  geotiffLayer: Layer,
  geoRaster: GeoRaster
) {
  if (geotiffLayer.getTooltip()) {
    geotiffLayer.unbindTooltip();
  }

  let geojsonLayer = null;

  function resetHighlight(e): void {
    geojsonLayer.resetStyle(e.target);
  }

  function highlight(e): void {
    const layer = e.target;
    layer.setStyle(GEOJSON_HIGHLIGHTED_STYLE);
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
    }
    updateTooltip(geoRaster, layer, e.latlng, layer.feature.properties.name);
  }

  geojsonLayer = L.geoJSON(geojson, {
    style: GEOJSON_STYLE,
    onEachFeature: (_, layer) => {
      layer.on({
        mouseover: highlight,
        mouseout: resetHighlight,
        mousemove: highlight,
      });
      layer.bindTooltip("");
    },
  })
    .addTo(leafletMap)
    .bringToFront();

  geojsonLayer.eachLayer((layer) => {
    layer._path.id = getPlacePathId(layer.feature.properties.geoDcid);
  });

  return geojsonLayer;
}
