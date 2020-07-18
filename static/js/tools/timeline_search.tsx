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
import { updateUrlPlace } from "./timeline_util";

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
    updateUrlPlace(this.state.placeId, false);
  }
}

interface SearchBarStateType {
  placeList: {};
}

interface SearchBarPropType {
  placeList: {};
}

class SearchBar extends Component<SearchBarPropType, SearchBarStateType> {
  constructor(props) {
    super(props);
    this.getPlaceAndRender = this.getPlaceAndRender.bind(this);
    this.state = {
      placeList: this.props.placeList,
    };
  }
  componentDidMount() {
    // Create the autocomplete object, restricting the search predictions to
    // geographical location types.
    const options = {
      types: ["(regions)"],
      fields: ["place_id", "name", "types"],
    };
    const acElem = document.getElementById("ac") as HTMLInputElement;
    ac = new google.maps.places.Autocomplete(acElem, options);
    ac.addListener("place_changed", this.getPlaceAndRender);
  }

  componentDidUpdate(prevProps) {
    if (this.props.placeList !== prevProps.placeList) {
      this.setState({
        placeList: this.props.placeList,
      });
    }
  }

  getPlaceAndRender() {
    // Get the place details from the autocomplete object.
    const place = ac.getPlace();
    axios
      .get(`/api/placeid2dcid/${place.place_id}`)
      .then((resp) => {
        updateUrlPlace(resp.data, true);
      })
      .catch(() => {
        alert("Sorry, but we don't have any data about " + name);
      });
    const acElem = document.getElementById("ac") as HTMLInputElement;
    acElem.value = "";
    acElem.setAttribute("placeholder", "Search for another place");
  }

  render() {
    return (
      <div id="location-field">
        <div id="search-icon"></div>
        <span id="prompt">Find : </span>
        <span id="place-list">
          {Object.keys(this.props.placeList).map((placeId, index) => (
            <Chip
              placeId={placeId}
              placeName={this.props.placeList[placeId]}
              key={index}
            ></Chip>
          ))}</span>
          <input
            id="ac"
            placeholder="Enter a country, state, county or city to get started"
            type="text"
          />
        <span id="place-name"></span>
      </div>
    );
  }
}
export { SearchBar };
