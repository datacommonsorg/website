/**
 * Copyright 2020 Google LLC
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

import axios from "axios";
import React from "react";

interface MapPropType {
  /**
   * The place dcid.
   */
  dcid: string;
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
    axios.get(`/api/place/mapinfo/${this.props.dcid}`).then(
      function (resp) {
        if (!this.div.current) {
          return;
        }
        const mapInfo = resp.data;
        if (!mapInfo || Object.keys(mapInfo).length === 0) return;
        const mapOptions = {
          mapTypeControl: false,
          draggable: true,
          scaleControl: true,
          scrollwheel: true,
          navigationControl: true,
          streetViewControl: false,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
        };
        const map = new google.maps.Map(this.div.current, mapOptions);

        // Map bounds.
        const sw = new google.maps.LatLng(mapInfo.down, mapInfo.left);
        const ne = new google.maps.LatLng(mapInfo.up, mapInfo.right);
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(sw);
        bounds.extend(ne);
        map.fitBounds(bounds);

        // Polygons of the place.
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
      }.bind(this)
    );
  }
}

export { Map };
