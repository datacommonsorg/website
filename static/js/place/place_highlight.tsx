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

import _ from "lodash";
import React from "react";

import { PageHighlight } from "../chart/types";
import { intl } from "../i18n/i18n";
import { urlToDisplayText } from "../shared/util";

interface PlaceHighlightPropsType {
  dcid: string;
  highlight: PageHighlight;
}

/**
 * Adds highlighted facts about a place under the subtitle of the page.
 */
class PlaceHighlight extends React.Component<PlaceHighlightPropsType> {
  constructor(props: PlaceHighlightPropsType) {
    super(props);
  }

  // TODO(datcom): make sure toLocaleString and toLocaleDate are enough for the
  // numeric value and date.
  render(): JSX.Element {
    const facts = Object.keys(this.props.highlight).map((factTitle: string) => {
      const factSnapshot = this.props.highlight[factTitle];
      if (_.isEmpty(factSnapshot.data)) {
        return null;
      }
      const factData = factSnapshot.data[0].data;
      if (_.isEmpty(factData)) {
        return null;
      }
      const factStatVar = Object.keys(factData)[0];
      const factValue = factData[factStatVar];
      const sourcesJsx = factSnapshot.sources.map((source, index) => {
        const sourceText = urlToDisplayText(source);
        return (
          <span key={source}>
            <a href={source}>{sourceText}</a>
            {index < factSnapshot.sources.length - 1 ? ", " : ""}
          </span>
        );
      });
      return (
        <h4 key={factStatVar}>
          {factTitle}: {factValue.toLocaleString(intl.locale)} (
          {factSnapshot.date.toLocaleString()}) {sourcesJsx}
        </h4>
      );
    });

    return <>{facts}</>;
  }
}

export { PlaceHighlight };
