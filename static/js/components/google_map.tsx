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
 * marker pin using the node's latitude and longitude properties.
 *
 * Note: If a node has both KML coordinates and lat/long properties, the KML
 * coordinates are preferred.
 */

import axios from "axios";
import _ from "lodash";
import React from "react";

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
}

interface GoogleMapStateType {
  // coordinates where marker should be drawn on the map.
  markerLocation: GoogleMapCoordinates;
  // response of mapinfo api with KML coordinates to draw.
  mapInfo: MapInfoResponse;
  // Whether there is data for map to render.
  shouldShowMap: boolean;
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
    };
  }

  render(): JSX.Element {
    if (!this.state.shouldShowMap) {
      return null;
    }
    return <div className="map-container" ref={this.div}></div>;
  }

  componentDidMount(): void {
    this.fetchData();
  }

  componentDidUpdate(): void {
    if (this.state.shouldShowMap) {
      // initialize Map
      const map = initMap(this.div.current);

      if (Object.values(this.state.mapInfo).every((val) => val !== null)) {
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
      .get(`/api/browser/propvals/latitude/${this.props.dcid}`)
      .then((resp) => resp.data)
      .catch((error) => console.log(error));
    const longitudePromise = axios
      .get(`/api/browser/propvals/longitude/${this.props.dcid}`)
      .then((resp) => resp.data)
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
          latitudes.values &&
          longitudes.values &&
          !_.isEmpty(latitudes.values.out) &&
          !_.isEmpty(longitudes.values.out)
        ) {
          // TODO (juliawu): Update logic to use highest precision lat/long if
          //                multiple values are provided
          const coordinates = {
            lat: parseFloat(latitudes.values.out[0].value),
            lng: parseFloat(longitudes.values.out[0].value),
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
