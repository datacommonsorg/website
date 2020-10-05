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

interface SubtitlePropsType {
  category: string;
  dcid: string;
}

class Subtitle extends React.Component<SubtitlePropsType, unknown> {
  render(): JSX.Element {
    const dcid = this.props.dcid;
    const category = this.props.category;
    let elem: JSX.Element;
    if (category == "Overview") {
      elem = (
        <h2 className="col-12 pt-2" id="overview">
          Overview
        </h2>
      );
    } else {
      elem = (
        <h2 className="col-12 pt-2">
          {category}
          <span className="more">
            <a href={"/place?dcid=" + dcid}>Back to overview ›</a>
          </span>
        </h2>
      );
    }
    return elem;
  }
}

export { Subtitle };
