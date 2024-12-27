/**
 * Copyright 2024 Google LLC
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

/** Tile for changing place via google maps search bar */

import React, { useEffect, useState } from "react";

import { initSearchAutocomplete } from "../shared/place_autocomplete";

interface PlaceSearchPropType {
  // Initial text to show when search bar renders
  searchPlaceholderText?: string;
  // Initial text to click on to open search bar
  toggleText?: string;
}

export function PlaceSearch(props: PlaceSearchPropType): JSX.Element {
  const [showSearchBar, setShowSearchBar] = useState(false);
  const toggleText = props.toggleText || "Change Place";

  useEffect(() => {
    // Mounts to id="place-autocomplete"
    initSearchAutocomplete("/place");
  }, []);

  return (
    <div id="change-place">
      <div
        id="change-place-toggle-text"
        className="toggle-text"
        onClick={(): void => setShowSearchBar(true)}
        style={{ display: `${showSearchBar ? "none" : ""}` }}
      >
        {toggleText}
      </div>
      <div
        className="search"
        style={{ display: `${showSearchBar ? "" : "none"}` }}
      >
        <div className="search-text">
          <div className="search-instructions">Enter a place name</div>
          <div className="location-field">
            <input
              id="place-autocomplete"
              className="place-autocomplete-input"
              placeholder=""
              type="text"
            />
          </div>
        </div>
        <div
          className="close-icon"
          onClick={(): void => setShowSearchBar(false)}
        >
          <span className="material-symbols-outlined">cancel</span>
        </div>
      </div>
    </div>
  );
}
