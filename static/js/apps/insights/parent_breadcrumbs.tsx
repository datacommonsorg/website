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

interface ParentPlacePropsType {
  parentPlaces: string[];
  placeType: string;
  names: { string: string };
  topic: string;
}

class ParentPlace extends React.Component<ParentPlacePropsType> {
  constructor(props: ParentPlacePropsType) {
    super(props);
  }

  render(): JSX.Element {
    const num = this.props.parentPlaces.length;
    return (
      <div>
        {this.props.parentPlaces &&
          this.props.parentPlaces.map((dcid, index) => {
            const name = this.props.names[dcid].split(",")[0];
            if (index === num - 1) {
              return <span key={dcid}>{name}</span>;
            }
            return (
              <React.Fragment key={dcid}>
                <a href={`/insights/#p=${dcid}&t=${this.props.topic}`}>
                  {name}
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
