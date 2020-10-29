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
import { displayNameForPlaceType } from "./util";

interface ParentPlacePropsType {
  parentPlaces: string[];
  placeType: string;
  names: { string: string };
}

class ParentPlace extends React.Component<ParentPlacePropsType> {
  constructor(props: ParentPlacePropsType) {
    super(props);
  }

  render(): JSX.Element {
    const num = this.props.parentPlaces.length;
    return (
      <React.Fragment>
        <span>A {displayNameForPlaceType(this.props.placeType)} in </span>
        {this.props.parentPlaces.map((dcid, index) => {
          const name = this.props.names[dcid].split(",")[0];
          if (index === num - 1) {
            return <span key={dcid}>{name}</span>;
          }
          return (
            <React.Fragment key={dcid}>
              <a
                className="place-links"
                href="#"
                onClick={this._handleClick.bind(this, dcid)}
              >
                {name}
              </a>
              {index < num - 1 && <span>, </span>}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  }

  _handleClick(dcid: string, e: Event): void {
    e.preventDefault();
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    urlParams.set("dcid", dcid);
    window.location.search = urlParams.toString();
  }
}

export { ParentPlace };
