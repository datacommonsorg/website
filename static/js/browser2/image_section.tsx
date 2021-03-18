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

/**
 * Component for rendering the image for the imageUrl property value.
 */

import React from "react";
import axios from "axios";
import _ from "lodash";

const PROPERTY_LABEL = "imageUrl";

interface ImageSectionPropType {
  dcid: string;
}

interface ImageSectionStateType {
  imageUrls: string[];
}

export class ImageSection extends React.Component<
  ImageSectionPropType,
  ImageSectionStateType
> {
  constructor(props: ImageSectionPropType) {
    super(props);
    this.state = {
      imageUrls: [],
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    if (_.isEmpty(this.state.imageUrls)) {
      return null;
    }
    return (
      <>
        {this.state.imageUrls.map((url, idx) => {
          return (
            <div key={"image" + idx} className="card">
              <img src={url} />
            </div>
          );
        })}
      </>
    );
  }

  private fetchData(): void {
    axios
      .get(`/api/browser/propvals/${PROPERTY_LABEL}/${this.props.dcid}`)
      .then((resp) => {
        const data = resp.data;
        if (!data || _.isEmpty(data.values)) {
          return;
        }
        this.setState({
          imageUrls: data.values.out,
        });
      });
  }
}
