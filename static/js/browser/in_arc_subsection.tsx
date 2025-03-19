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
 * Component for displaying a single group of in arcs of the same parentType and property.
 */

import React from "react";

import { ArcTableRow } from "./arc_table_row";
import { InArcValue } from "./types";

interface InArcSubsectionPropType {
  nodeName: string;
  parentType: string;
  property: string;
  arcValues: Array<InArcValue>;
  provDomain: { [key: string]: URL };
}

export class InArcSubsection extends React.Component<InArcSubsectionPropType> {
  constructor(props: InArcSubsectionPropType) {
    super(props);
  }

  render(): JSX.Element {
    // TODO (chejennifer): limit height of the card and add a show more button
    const arcValues = this.props.arcValues;
    arcValues.sort((a, b) => {
      const aValue = a.name ? a.name : a.dcid;
      const bValue = b.name ? b.name : b.dcid;
      if (aValue < bValue) {
        return -1;
      } else if (aValue > bValue) {
        return 1;
      } else {
        return 0;
      }
    });
    return (
      <div className="card p-0">
        <h4
          id={`${this.props.parentType}-${this.props.property}`}
          className="arc-group-title"
        >
          <span className="mp">Subject Type: {this.props.parentType}</span>
        </h4>
        <div className="in-arc-table">
          <table className="node-table">
            <tbody>
              {arcValues.map((arcValue, index) => {
                const valueText = arcValue.name ? arcValue.name : arcValue.dcid;
                return (
                  <ArcTableRow
                    key={this.props.property + index}
                    propertyLabel={this.props.property}
                    values={[{ dcid: arcValue.dcid, text: valueText }]}
                    provenanceId={arcValue.provenanceId}
                    src={
                      this.props.provDomain[arcValue.provenanceId]
                        ? this.props.provDomain[arcValue.provenanceId]
                        : null
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}
