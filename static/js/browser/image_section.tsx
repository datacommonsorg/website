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

import axios from "axios";
import _ from "lodash";
import React from "react";

import { PropertyValueGroup } from "../shared/types";
import { loadSpinner, removeSpinner } from "../shared/util";

const IMAGE_URL_PROPERTY_LABEL = "imageUrl";
const LOADING_CONTAINER_ID = "browser-image-section";
interface ImageSectionPropType {
  dcid: string;
}

interface ImageSectionStateType {
  imageUrls: string[];
  errorMessage: string;
}

export class ImageSection extends React.Component<
  ImageSectionPropType,
  ImageSectionStateType
> {
  constructor(props: ImageSectionPropType) {
    super(props);
    this.state = {
      errorMessage: "",
      imageUrls: [],
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    if (!_.isEmpty(this.state.errorMessage)) {
      return <div className="error-message">{this.state.errorMessage}</div>;
    }
    return (
      <div id={LOADING_CONTAINER_ID} className="loading-spinner-container">
        {this.state.imageUrls.map((url, idx) => {
          return (
            <div key={"image" + idx} className="card">
              <img src={url} />
            </div>
          );
        })}
        <div id="browser-screen" className="screen">
          <div id="spinner"></div>
        </div>
      </div>
    );
  }

  private fetchData(): void {
    loadSpinner(LOADING_CONTAINER_ID);
    axios
      .get<PropertyValueGroup>(
        `/api/node/propvals/out?prop=${IMAGE_URL_PROPERTY_LABEL}&dcids=${this.props.dcid}`
      )
      .then((resp) => {
        const data = resp.data;
        if (!data[this.props.dcid]) {
          return;
        }
        const imgUrls = data[this.props.dcid].map(
          (imgUrlValue) => imgUrlValue.value
        );
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          imageUrls: imgUrls,
        });
      })
      .catch(() => {
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          errorMessage: "Error retrieiving image url.",
        });
      });
  }
}
