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
 */

import axios from "axios";
import _ from "lodash";
import React from "react";

const DEFAULT_MAP_ZOOM = 4;

// number of digits after decimal point in LatLong/<lat>_<long> dcids
const LAT_LONG_PRECISION = 5;

interface GoogleMapPropType {
  /**
   * DCID of the place/event to show a map for.
   */
  dcid: string;
}

interface GoogleMapStateType {
  /**
   * Stores responses from api calls.
   */
  markerLocation: GoogleMapCoordinates;
  mapInfo: MapInfoResponse;
}

interface GoogleMapCoordinates {
  /**
   * Lat/Long coordinates, stored in a form the Google maps API expects.
   */
  lat: number;
  lng: number;
}

interface MapInfoResponse {
  /**
   * Response format of /api/place/mapinfo/.
   */
  up: number;
  down: number;
  left: number;
  right: number;
  coordinateSequenceSet: google.maps.LatLng[][];
}

/**
 * Converts a DCID of the form latLong/<latitude>_<longitude> to
 * lat/long coordinates used by the google maps API.
 * @param dcid latLong DCID to convert
 * @returns a {lat: latitude, lng: longitude} object for the google maps API
 */
function convertLatLongDcid(dcid: string): GoogleMapCoordinates {
  if (dcid.startsWith("latLong/") && dcid.includes("_")) {
    const coordinateStrings = dcid.slice("latLong/".length).split("_");
    const coords = coordinateStrings.map((coordString) =>
      // Add decimal point to parsed latitude and longitude numbers
      parseFloat(
        coordString.slice(0, -LAT_LONG_PRECISION) +
          "." +
          coordString.slice(-LAT_LONG_PRECISION)
      )
    );
    return { lat: coords[0], lng: coords[1] };
  }
  return null;
}

/**
 * Initialize a google map widget.
 * @param container the element to render the map in
 */
function initMap(container: HTMLDivElement): google.maps.Map {
  // set height for map to be visible
  container.style.height = "100%";
  container.style.minHeight = "160px";
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
 * @param state current component state with KML Coordinates stored in it
 * @param map map to draw polygon in
 */
function drawKmlCoordinates(
  state: GoogleMapStateType,
  map: google.maps.Map
): void {
  const mapInfo = state.mapInfo;

  // Adjust map bounds
  const sw = new google.maps.LatLng(mapInfo.down, mapInfo.left);
  const ne = new google.maps.LatLng(mapInfo.up, mapInfo.right);
  const bounds = new google.maps.LatLngBounds();
  bounds.extend(sw);
  bounds.extend(ne);
  map.fitBounds(bounds);

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
    };
  }

  render(): JSX.Element {
    return <div className="map-container" ref={this.div}></div>;
  }

  componentDidMount(): void {
    this.fetchData();
  }

  componentDidUpdate(): void {
    // Initialize map
    const map = initMap(this.div.current);

    // plot KML Coordinates
    if (Object.values(this.state.mapInfo).every((val) => val !== null)) {
      drawKmlCoordinates(this.state, map);
    }
    // plot marker
    else if (this.state.markerLocation.lat && this.state.markerLocation.lng) {
      drawMarker(this.state.markerLocation, map);
    }
  }

  private fetchData(): void {
    // Skip API calls if we can get lat/long from DCID itself
    if (
      this.props.dcid.startsWith("latLong/") &&
      this.props.dcid.includes("_")
    ) {
      this.setState({
        markerLocation: convertLatLongDcid(this.props.dcid),
      });
    } else {
      // Get KML Coordinates for polygons
      const polygonPromise = axios
        .get(`/api/place/mapinfo/${this.props.dcid}`)
        .then((resp) => resp.data);

      // Get lat/long from properties
      const latitudePromise = axios
        .get(`/api/browser/propvals/latitude/${this.props.dcid}`)
        .then((resp) => resp.data);
      const longitudePromise = axios
        .get(`/api/browser/propvals/longitude/${this.props.dcid}`)
        .then((resp) => resp.data);

      Promise.all([polygonPromise, latitudePromise, longitudePromise]).then(
        ([mapInfo, latitudes, longitudes]) => {
          // Update state with mapInfo
          if (mapInfo && Object.keys(mapInfo).length > 0) {
            this.setState({
              mapInfo: mapInfo,
            });
          }

          // Update state with lat/long if both are present
          if (
            latitudes.values &&
            longitudes.values &&
            !_.isEmpty(latitudes.values.out) &&
            !_.isEmpty(longitudes.values.out)
          ) {
            const latValues = latitudes.values.out.map(
              (latValue) => latValue.value
            );
            const longValues = longitudes.values.out.map(
              (longValue) => longValue.value
            );
            //TODO (juliawu): Update logic to use highest precision lat/long if
            //                multiple values are provided
            const coordinates = {
              lat: parseFloat(latValues[0]),
              lng: parseFloat(longValues[0]),
            };
            this.setState({ markerLocation: coordinates });
          }
        }
      );
    }
  }
}
