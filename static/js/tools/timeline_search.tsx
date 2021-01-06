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

import React, { Component, PureComponent } from "react";
import {} from "googlemaps";
import axios from "axios";

interface ChipPropType {
  placeName: string;
  placeId: string;
  removePlace: (place: string) => void;
}

class Chip extends PureComponent<ChipPropType, Record<string, unknown>> {
  constructor(props) {
    super(props);
    this.deleteChip = this.deleteChip.bind(this);
  }

  render() {
    return (
      <span className="mdl-chip mdl-chip--deletable">
        <span className="mdl-chip__text">{this.props.placeName}</span>
        <button className="mdl-chip__action" onClick={this.deleteChip}>
          <i className="material-icons">cancel</i>
        </button>
      </span>
    );
  }

  private deleteChip() {
    this.props.removePlace(this.props.placeId);
  }
}

interface SearchBarPropType {
  places: Record<string, string>;
  addPlace: (place: string) => void;
  removePlace: (place: string) => void;
}

class SearchBar extends Component<SearchBarPropType> {
  inputElem: React.RefObject<HTMLInputElement>;
  ac: google.maps.places.Autocomplete;

  constructor(props: SearchBarPropType) {
    super(props);
    this.getPlaceAndRender = this.getPlaceAndRender.bind(this);
    this.inputElem = React.createRef();
    this.ac = null;
  }

  render(): JSX.Element {
    return (
      <div id="location-field">
        <div id="search-icon"></div>
        <span id="prompt">Find : </span>
        <span id="place-list">
          {Object.keys(this.props.places).map((placeId) => (
            <Chip
              placeId={placeId}
              placeName={
                this.props.places[placeId]
                  ? this.props.places[placeId]
                  : placeId
              }
              key={placeId}
              removePlace={this.props.removePlace}
            ></Chip>
          ))}
        </span>
        <input ref={this.inputElem} id="ac" type="text" />
        <span id="place-name"></span>
      </div>
    );
  }

  componentDidMount(): void {
    // Create the autocomplete object, restricting the search predictions to
    // geographical location types.
    const options = {
      types: ["(regions)"],
      fields: ["place_id", "name", "types"],
    };
    if (google.maps) {
      this.ac = new google.maps.places.Autocomplete(
        this.inputElem.current,
        options
      );
      this.ac.addListener("place_changed", this.getPlaceAndRender);
    }
  }

  private getPlaceAndRender() {
    // Get the place details from the autocomplete object.
    const place = this.ac.getPlace();
    axios
      .get(`/api/placeid2dcid/${place.place_id}`)
      .then((resp) => {
        this.props.addPlace(resp.data);
      })
      .catch(() => {
        alert("Sorry, but we don't have any data about " + name);
      });
    this.setPlaceholder();
  }

  private setPlaceholder() {
    this.inputElem.current.value = "";
    if (Object.keys(this.props.places).length > 0) {
      this.inputElem.current.placeholder = "Add another place";
    } else {
      this.inputElem.current.placeholder =
        "Enter a country, state, county or city to get started";
    }
  }
}
export { SearchBar };
