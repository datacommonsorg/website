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
 * Component for rendering a map with a marker at a set lat/long coordinate
 */

import React from "react";

interface MapMarkerType {
  /**
   * Lat/Long coordinates, stored in a form the Google maps API expects.
   */
  lat: number;
  lng: number;
}

interface MapPropType {
  /**
   * A lat/long location to plot a marker for
   */
  location: MapMarkerType;
}

/**
 * Converts a DCID of the form latLong/<latitude>_<longitude> to
 * lat/long coordinates used by the google maps API.
 * @param dcid latLong DCID to convert
 * @returns a {lat: latitude, lng: longitude} object for the google maps API
 */
export function getLocationFromDcid(dcid: string): MapMarkerType {
  if (dcid.startsWith("latLong/") && dcid.includes("_")) {
    const coordinateStrings = dcid.slice(8).split("_");
    const coords = coordinateStrings.map((coordString) =>
      parseFloat(coordString.slice(0, -5) + "." + coordString.slice(-5))
    );
    return { lat: coords[0], lng: coords[1] };
  }
  return null;
}

class Map extends React.Component<MapPropType> {
  div: React.RefObject<HTMLDivElement>;

  constructor(props: MapPropType) {
    super(props);
    this.div = React.createRef();
  }
  render(): JSX.Element {
    return <div id="map-container" ref={this.div}></div>;
  }

  componentDidMount(): void {
    const mapOptions = {
      mapTypeControl: false,
      draggable: true,
      scaleControl: true,
      scrollwheel: true,
      navigationControl: true,
      streetViewControl: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      zoom: 4,
      center: this.props.location,
    };
    const map = new google.maps.Map(this.div.current, mapOptions);
    const marker = new google.maps.Marker({
      position: this.props.location,
    });
    marker.setMap(map);
  }
}

export { Map };
