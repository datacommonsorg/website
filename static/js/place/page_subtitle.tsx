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
import { intl, translateVariableString } from "../i18n/i18n";

interface PageSubtitlePropsType {
  category: string;
  dcid: string;
}

/**
 * A componenet to display the subtitle above chart section. It includes
 * the category name and a navigation link for non-overview pages.
 */
class PageSubtitle extends React.Component<PageSubtitlePropsType> {
  render(): JSX.Element {
    const dcid = this.props.dcid;
    const category = this.props.category;
    let elem: JSX.Element;
    if (category == "Overview") {
      elem = (
        <h2 className="col-12 pt-2" id="overview">
          {intl.formatMessage({
            id: "header:overview",
            defaultMessage: "Overview",
            description:
              "Text for header or subheader of Overview charts on place pages.",
          })}
        </h2>
      );
    } else {
      // TODO(datcom): confirm that we scrape the categories from chart config for translation.
      elem = (
        <h2 className="col-12 pt-2">
          {translateVariableString(category)}
          <span className="more">
            <a href={"/place/" + dcid}>
              {intl.formatMessage({
                id: "link:return_to_overview",
                defaultMessage: "Back to overview ›",
                description:
                  "Text for the link present in subtopic place pages directing the user back to the Overview page.",
              })}
            </a>
          </span>
        </h2>
      );
    }
    return elem;
  }
}

export { PageSubtitle };
