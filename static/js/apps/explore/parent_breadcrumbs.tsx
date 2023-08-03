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

import React from "react";

import { NamedTypedPlace } from "../../shared/types";

interface ParentPlacePropsType {
  parentPlaces: NamedTypedPlace[];
  placeType: string;
  topic: string;
}

class ParentPlace extends React.Component<ParentPlacePropsType> {
  constructor(props: ParentPlacePropsType) {
    super(props);
  }

  render(): JSX.Element {
    let num = 0;
    if (this.props.parentPlaces) {
      num = this.props.parentPlaces.length;
    }
    return (
      <div id="parent-places">
        {num > 0 && <span id="parent-place-head">Located in </span>}
        {num > 0 &&
          this.props.parentPlaces.map((parent, index) => {
            if (index === num - 1) {
              return (
                <a
                  className="parent-place-link"
                  key={parent.dcid}
                  href={`/explore/#p=${parent.dcid}&t=${this.props.topic}`}
                >
                  {parent.name}
                </a>
              );
            }
            return (
              <React.Fragment key={parent.dcid}>
                <a
                  className="parent-place-link"
                  href={`/explore/#p=${parent.dcid}&t=${this.props.topic}`}
                >
                  {parent.name}
                </a>
                {index < num - 1 && <span>, </span>}
              </React.Fragment>
            );
          })}
      </div>
    );
  }
}

export { ParentPlace };
