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

import React from "react";

import { intl, LocalizedLink } from "../i18n/i18n";
import { displayNameForPlaceType } from "./util";

interface ChildPlacePropType {
  childPlaces: { string: string[] };
  placeName: string;
}

class ChildPlace extends React.Component<ChildPlacePropType> {
  render(): JSX.Element {
    if (Object.keys(this.props.childPlaces).length === 0) {
      return <React.Fragment></React.Fragment>;
    }
    return (
      <React.Fragment>
        <span id="child-place-head">
          {intl.formatMessage(
            {
              id: "child_places_menu-places_in_place",
              defaultMessage: "Places in {placeName}",
              description:
                'Used for the child places navigation sidebar. Shows a list of place contained in the current place. For example, the sidebar for the Austria place page shows links to child places under the header "Places in {Austria}".',
            },
            { placeName: this.props.placeName }
          )}
        </span>
        {[...Object.keys(this.props.childPlaces)].sort().map((placeType) => (
          <div key={placeType} className="child-place-group">
            <div className="child-place-type">
              {displayNameForPlaceType(placeType, true /* isPlural */)}
            </div>
            {this.props.childPlaces[placeType].map((place, i) => (
              <LocalizedLink
                key={place.dcid}
                className="child-place-link"
                href={"/place/" + place.dcid}
                text={
                  (place.name || place.dcid) +
                  (i < this.props.childPlaces[placeType].length - 1 ? "," : "")
                }
              />
            ))}
          </div>
        ))}
      </React.Fragment>
    );
  }
}

export { ChildPlace };
