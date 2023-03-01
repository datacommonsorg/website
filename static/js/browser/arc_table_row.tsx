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
 * Component for displaying a single row in a table that displays
 * the property, value, and provenance of an arc.
 */

import _ from "lodash";
import React from "react";

import { GoogleMap } from "../components/google_map";
import { ArcValue } from "./types";

const HREF_PREFIX = "/browser/";
const NUM_VALUES_UNEXPANDED = 5;

interface ArcTableRowPropType {
  propertyLabel: string;
  values: Array<ArcValue>;
  // If provenanceId and src are skipped, ensure that table only has 2-columns.
  provenanceId?: string;
  src?: URL;
  // If set to true, will not add a link to the property node.
  noPropLink?: boolean;
}

interface ArcTableRowStateType {
  expanded: boolean;
}

export class ArcTableRow extends React.Component<
  ArcTableRowPropType,
  ArcTableRowStateType
> {
  showExpando: boolean;

  constructor(props: ArcTableRowPropType) {
    super(props);
    this.state = {
      expanded: false,
    };
    this.showExpando = this.props.values.length > NUM_VALUES_UNEXPANDED;
  }

  renderValue(value: ArcValue): JSX.Element {
    return (
      <div className="arc-text" key={value.text}>
        {value.dcid ? (
          <>
            <a href={HREF_PREFIX + value.dcid}>{value.text}</a>
            {value.dcid !== value.text && (
              <span className="dcid-text"> (dcid: {value.dcid})</span>
            )}
            {value.dcid.startsWith("latLong/") && (
              <GoogleMap dcid={value.dcid}></GoogleMap>
            )}
          </>
        ) : (
          <span>{value.text}</span>
        )}
      </div>
    );
  }

  renderExpando(): JSX.Element {
    if (!this.showExpando) {
      return null;
    }
    if (this.state.expanded) {
      return (
        <div className="expando" onClick={this.showLess.bind(this)}>
          <i className="material-icons">remove</i>
          <span>Show less</span>
        </div>
      );
    } else {
      return (
        <div className="expando" onClick={this.showMore.bind(this)}>
          <i className="material-icons">add</i>
          <span>Show more</span>
        </div>
      );
    }
  }

  render(): JSX.Element {
    return (
      <tr>
        <td className="property-column">
          {this.props.noPropLink ? (
            this.props.propertyLabel
          ) : (
            <a href={HREF_PREFIX + this.props.propertyLabel}>
              {this.props.propertyLabel}
            </a>
          )}
        </td>
        <td>
          <div className="values-row">
            {_.slice(this.props.values, 0, NUM_VALUES_UNEXPANDED).map(
              (value) => {
                return this.renderValue(value);
              }
            )}
            {this.renderExpando()}
            {this.state.expanded &&
              _.slice(this.props.values, NUM_VALUES_UNEXPANDED).map((value) => {
                return this.renderValue(value);
              })}
          </div>
        </td>
        {this.props.provenanceId && this.props.src && (
          <td className="provenance-column">
            {this.props.provenanceId && (
              <a href={HREF_PREFIX + this.props.provenanceId}>
                {this.props.src}
              </a>
            )}
          </td>
        )}
      </tr>
    );
  }

  private showMore(): void {
    this.setState({
      expanded: true,
    });
  }

  private showLess(): void {
    this.setState({
      expanded: false,
    });
  }
}
