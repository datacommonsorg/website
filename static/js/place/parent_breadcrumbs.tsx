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
import { intl } from "../l10n/i18n";
import { RawIntlProvider, FormattedMessage } from "react-intl";

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
      // TODO(datcom): Please see the extracted output and required compiled input for place_breadcrumb.
      // We may need to do still fancier things to have the parentPlace(s) be included. That would mean
      // creating a more complex FormattedMessage type to account for the variable hrefs.
      <RawIntlProvider value={intl}>
        <FormattedMessage
          id="place_breadcrumb"
          description="Gives context for where this place is located. E.g. Tokyo is a city in Japan, Asia."
          defaultMessage="A {placeType} in "
          values={{
            placeType: displayNameForPlaceType(this.props.placeType),
          }}
        />
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
      </RawIntlProvider>
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
