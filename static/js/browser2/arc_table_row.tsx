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

import React from "react";
import _ from "lodash";
import { ArcValue } from "./util";

const HREF_PREFIX = "/browser/";
const NUM_VALUES_UNEXPANDED = 5;

interface ArcTableRowPropType {
  propertyLabel: string;
  values: Array<ArcValue>;
  provenanceId: string;
  src: URL;
}

interface ArcTableRowStateType {
  expanded: boolean;
}

export class ArcTableRow extends React.Component<
  ArcTableRowPropType,
  ArcTableRowStateType
> {
  constructor(props: ArcTableRowPropType) {
    super(props);
    this.state = {
      expanded: false,
    };
  }

  render(): JSX.Element {
    const values = this.state.expanded
      ? this.props.values
      : _.slice(this.props.values, 0, NUM_VALUES_UNEXPANDED);
    const hasMoreValues = this.props.values.length > NUM_VALUES_UNEXPANDED;
    return (
      <tr>
        <td className="property-column">
          <a href={HREF_PREFIX + this.props.propertyLabel}>
            {this.props.propertyLabel}
          </a>
        </td>
        <td>
          <div className="values-row">
            {values.map((value) => {
              return (
                <div className="arc-text" key={value.text}>
                  {value.dcid ? (
                    <a href={HREF_PREFIX + value.dcid}>{value.text}</a>
                  ) : (
                    <span>{value.text}</span>
                  )}
                </div>
              );
            })}
          </div>
          {this.state.expanded ? (
            <div className="clickable-text" onClick={this.showLess.bind(this)}>
              Show less
            </div>
          ) : null}
          {hasMoreValues && !this.state.expanded ? (
            <div className="clickable-text" onClick={this.showMore.bind(this)}>
              Show more
            </div>
          ) : null}
        </td>
        <td className="provenance-column">
          {this.props.provenanceId && (
            <a href={HREF_PREFIX + this.props.provenanceId}>{this.props.src}</a>
          )}
        </td>
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
