import React, { Component } from "react";
import axios from "axios";
import { updateUrlPlace } from "./util";

let ac: google.maps.places.Autocomplete;

interface PlacePropType {
  placeName: string;
  placeId: string;
  deleteChip: (placeName: string, placeString: string) => void;
}

class Chip extends Component<PlacePropType, {}> {
  render() {
    return (
      <span className="mdl-chip mdl-chip--deletable">
        <span className="mdl-chip__text">{this.props.placeName}</span>
        <button
          className="mdl-chip__action"
          onClick={() =>
            this.props.deleteChip(this.props.placeName, this.props.placeId)
          }
        >
          <i className="material-icons">cancel</i>
        </button>
      </span>
    );
  }
}

interface SearchBarStateType {
  placeList: string[][];
}

class SearchBar extends Component<{}, SearchBarStateType> {
  constructor(props) {
    super(props);
    this.getPlaceAndRender = this.getPlaceAndRender.bind(this);
    this.deleteChip = this.deleteChip.bind(this);
    this.state = {
      placeList: [],
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

  getPlaceAndRender() {
    // Get the place details from the autocomplete object.
    const place = ac.getPlace();
    axios
      .get(`api/placeid2dcid/${place.place_id}`)
      .then((resp) => {
        if (updateUrlPlace(resp.data, true)) {
          this.state.placeList.push([place.name, resp.data]);
        }
      })
      .catch(function (error) {
        console.log(error);
        alert("Sorry, but we don't have any data about " + name);
      });
    const acElem = document.getElementById("ac") as HTMLInputElement;
    acElem.value = "";
    acElem.setAttribute("placeholder", "Search for another place");
  }

  deleteChip(placeName, placeId) {
    updateUrlPlace(placeId, false);
    this.state.placeList.splice(
      this.state.placeList.indexOf([placeName, placeId]),
      1
    );
  }

  render() {
    return (
      <div id="location-field">
        <div id="search-icon"></div>
        <span id="place-list">
          {this.state.placeList.map((place) => (
            <Chip
              placeName={place[0]}
              placeId={place[1]}
              key={place[0]}
              deleteChip={this.deleteChip}
            ></Chip>
          ))}
          <input
            id="ac"
            placeholder="Enter a country, state, county or city to get started"
            type="text"
          />
          <span id="place-name"></span>
        </span>
      </div>
    );
  }
}
export { SearchBar };
