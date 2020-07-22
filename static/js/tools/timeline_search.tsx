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

import React, { Component } from "react";
import axios from "axios";
import { updateUrl } from "./timeline_util";

let ac: google.maps.places.Autocomplete;

interface ChipPropType {
  placeName: string;
  placeId: string;
}

interface ChipStateType {
  placeId: string;
}

class Chip extends Component<ChipPropType, ChipStateType> {
  constructor(props) {
    super(props);
    this.deleteChip = this.deleteChip.bind(this);
    this.state = {
      placeId: props.placeId,
    };
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
  deleteChip() {
    updateUrl({ place: { place: this.state.placeId, shouldAdd: false } });
  }
}

interface SearchBarStateType {
  places: [string, string][];
}

interface SearchBarPropType {
  places: [string, string][];
}

class SearchBar extends Component<SearchBarPropType, SearchBarStateType> {
  inputElem: React.RefObject<HTMLInputElement>;

  constructor(props) {
    super(props);
    this.getPlaceAndRender = this.getPlaceAndRender.bind(this);
    this.state = {
      places: this.props.places,
    };
    this.inputElem = React.createRef();
  }

  render() {
    return (
      <div id="location-field">
        <div id="search-icon"></div>
        <span id="prompt">Find : </span>
        <span id="place-list">
          {this.props.places.map((placeData) => (
            <Chip
              placeId={placeData[0]}
              placeName={placeData[1]}
              key={placeData[0]}
            ></Chip>
          ))}
        </span>
        <input ref={this.inputElem} id="ac" type="text" />
        <span id="place-name"></span>
      </div>
    );
  }

  componentDidMount() {
    // Create the autocomplete object, restricting the search predictions to
    // geographical location types.
    const options = {
      types: ["(regions)"],
      fields: ["place_id", "name", "types"],
    };
    ac = new google.maps.places.Autocomplete(this.inputElem.current, options);
    ac.addListener("place_changed", this.getPlaceAndRender);
  }

  componentDidUpdate(prevProps) {
    this.setPlaceholder();
    if (this.props.places !== prevProps.places) {
      this.setState({
        places: this.props.places,
      });
    }
  }

  private getPlaceAndRender() {
    // Get the place details from the autocomplete object.
    const place = ac.getPlace();
    axios
      .get(`/api/placeid2dcid/${place.place_id}`)
      .then((resp) => {
        updateUrl({ place: { place: resp.data, shouldAdd: true } });
      })
      .catch(() => {
        alert("Sorry, but we don't have any data about " + name);
      });
    this.setPlaceholder();
  }

  private setPlaceholder() {
    this.inputElem.current.value = "";
    if (this.state.places.length > 0) {
      this.inputElem.current.placeholder = "Add another place";
    } else {
      this.inputElem.current.placeholder =
        "Enter a country, state, county or city to get started";
    }
  }
}
export { SearchBar };
