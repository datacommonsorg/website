/**
 * Copyright 2023 Google LLC
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
 * Component for embedding a map from Google Maps
 *
 * Used for plotting a place or location on a map via Google Maps, given that
 * place, location, or event's DCID. This component can plot either KML
 * coordinates from the /api/places/mapinfo api as polygons, or a lat/long
 * marker pin using the node's latitude and longitude properties, or a geoJson.
 *
 * Only one is drawn, in this order:
 * 1. props.geoJson
 * 2. props.latLong
 * 3. KML polygon of the node from /api/places/mapinfo
 * 4. lat/long of the node.
 */

import axios from "axios";
import _ from "lodash";
import React from "react";

import { PropertyValues } from "../shared/api_response_types";

const DEFAULT_MAP_ZOOM = 4;
const MAP_BOUNDS_PADDING = 0;

/**
 * Response format of /api/place/mapinfo/.
 */
interface MapInfoResponse {
  up: number;
  down: number;
  left: number;
  right: number;
  coordinateSequenceSet: google.maps.LatLng[][];
}

/**
 * Lat/Long coordinates, stored in a form the Google maps API expects.
 */
interface GoogleMapCoordinates {
  lat: number;
  lng: number;
}

interface GoogleMapPropType {
  // DCID of the place/event to show a map for.
  dcid: string;
  // If set, a geometry GeoJson object (what is stored in the KG under
  // geoJsonCoordinates etc).  Takes precedence over other supported location
  // info available for the dcid.
  geoJsonGeometry?: string;
  // If set, a <lat,long> pair.  Takes precedence over other supported location
  // info available for the dcid, except for supplied geoJsonFromGeometry.
  latLong?: [number, number];
}

interface GoogleMapStateType {
  // coordinates where marker should be drawn on the map.
  markerLocation: GoogleMapCoordinates;
  // response of mapinfo api with KML coordinates to draw.
  mapInfo: MapInfoResponse;
  // Whether there is data for map to render.
  shouldShowMap: boolean;
  geoJson: object;
}

/**
 * Initialize a google map widget.
 * @param container the element to render the map in
 */
function initMap(container: HTMLDivElement): google.maps.Map {
  const mapOptions = {
    mapTypeControl: false,
    draggable: true,
    scaleControl: true,
    scrollwheel: true,
    navigationControl: true,
    streetViewControl: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: DEFAULT_MAP_ZOOM,
  };
  return new google.maps.Map(container, mapOptions);
}

/**
 * Draw polygons on map given KML coordinates for each polygon.
 * @param mapInfo response from mapinfo api with KML Coordinates stored in it
 * @param map map to draw polygon in
 */
function drawKmlCoordinates(
  mapInfo: MapInfoResponse,
  map: google.maps.Map
): void {
  // Adjust map bounds
  const sw = new google.maps.LatLng(mapInfo.down, mapInfo.left);
  const ne = new google.maps.LatLng(mapInfo.up, mapInfo.right);
  let bounds = new google.maps.LatLngBounds();
  bounds = bounds.extend(sw);
  bounds = bounds.extend(ne);
  map.fitBounds(bounds, MAP_BOUNDS_PADDING);

  // Add polygons
  if (mapInfo.coordinateSequenceSet) {
    for (const coordinateSequence of mapInfo.coordinateSequenceSet) {
      const polygon = new google.maps.Polygon({
        paths: coordinateSequence,
        strokeColor: "#FF0000",
        strokeOpacity: 0.6,
        strokeWeight: 1,
        fillOpacity: 0.15,
      });
      polygon.setMap(map);
    }
  }
}

/**
 * Draw a map marker at a specific lat/long.
 * @param location lat/long position of marker
 * @param map map to draw marker on
 */
function drawMarker(
  location: GoogleMapCoordinates,
  map: google.maps.Map
): void {
  map.setCenter(location);
  const marker = new google.maps.Marker({
    position: location,
  });
  marker.setMap(map);
}

/**
 * Draw a geojson polygon.
 * @param geoJson A complete geoJson feature collection.
 * @param map map to draw in
 */
function drawGeoJson(geoJson: any, map: google.maps.Map) {
  map.data.addGeoJson(geoJson);
  const bounds = new google.maps.LatLngBounds();
  map.data.forEach(function (feature) {
    feature.getGeometry().forEachLatLng(function (latlng) {
      bounds.extend(latlng);
    });
  });

  map.fitBounds(bounds);
}

function geoJsonFromGeometry(
  geoJsonGeometry: string
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: JSON.parse(geoJsonGeometry),
        properties: {}, // TODO: Fill in with a name or dcid.
      },
    ],
  };
}

export class GoogleMap extends React.Component<
  GoogleMapPropType,
  GoogleMapStateType
> {
  div: React.RefObject<HTMLDivElement>;

  constructor(props: GoogleMapPropType) {
    super(props);
    this.div = React.createRef();
    this.state = {
      markerLocation: { lat: null, lng: null },
      mapInfo: {
        up: null,
        down: null,
        left: null,
        right: null,
        coordinateSequenceSet: [],
      },
      shouldShowMap: false,
      geoJson: null,
    };
  }

  render(): JSX.Element {
    if (!this.state.shouldShowMap) {
      return null;
    }
    return <div className="map-container" ref={this.div}></div>;
  }

  componentDidMount(): void {
    if (this.props.geoJsonGeometry) {
      const geoJson = geoJsonFromGeometry(this.props.geoJsonGeometry);
      this.setState({
        shouldShowMap: true,
        geoJson: geoJson,
      });
    } else if (this.props.latLong) {
      const coordinates = {
        lat: this.props.latLong[0],
        lng: this.props.latLong[1],
      };
      this.setState({
        markerLocation: coordinates,
        shouldShowMap: true,
      });
    } else {
      this.fetchData();
    }
  }

  componentDidUpdate(): void {
    if (this.state.shouldShowMap) {
      // initialize Map
      const map = initMap(this.div.current);

      if (this.state.geoJson) {
        drawGeoJson(this.state.geoJson, map);
      } else if (
        Object.values(this.state.mapInfo).every((val) => val !== null)
      ) {
        // default to drawing polygons via KML coordinates if available
        drawKmlCoordinates(this.state.mapInfo, map);
      } else if (
        this.state.markerLocation.lat &&
        this.state.markerLocation.lng
      ) {
        // only draw marker pin if KML coordinates were not found
        drawMarker(this.state.markerLocation, map);
      }
    }
  }

  private fetchData(): void {
    // Get KML Coordinates for polygons
    const polygonPromise = axios
      .get(`/api/place/mapinfo/${this.props.dcid}`)
      .then((resp) => resp.data)
      .catch((error) => console.log(error));

    // Get lat/long from properties
    const latitudePromise = axios
      .get<PropertyValues>(
        `/api/node/propvals/out?prop=latitude&dcids=${this.props.dcid}`
      )
      .then((resp) => resp.data[this.props.dcid])
      .catch((error) => console.log(error));
    const longitudePromise = axios
      .get<PropertyValues>(
        `/api/node/propvals/out?prop=longitude&dcids=${this.props.dcid}`
      )
      .then((resp) => resp.data[this.props.dcid])
      .catch((error) => console.log(error));

    Promise.all([polygonPromise, latitudePromise, longitudePromise])
      .then(([mapInfo, latitudes, longitudes]) => {
        // Update state with mapInfo
        if (!_.isEmpty(mapInfo)) {
          this.setState({
            mapInfo: mapInfo,
            shouldShowMap: true,
          });
        }

        // Update state with lat/long if both are present
        if (
          !_.isEmpty(latitudes) &&
          !_.isEmpty(longitudes) &&
          !_.isEmpty(latitudes[0].value) &&
          !_.isEmpty(longitudes[0].value)
        ) {
          // TODO (juliawu): Update logic to use highest precision lat/long if
          //                multiple values are provided
          const coordinates = {
            lat: parseFloat(latitudes[0].value),
            lng: parseFloat(longitudes[0].value),
          };
          this.setState({
            markerLocation: coordinates,
            shouldShowMap: true,
          });
        }
      })
      .catch((error) => console.log(error));
  }
}
