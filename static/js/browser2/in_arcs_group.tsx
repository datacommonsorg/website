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

interface InArcsGroupPropType {
  nodeName: string;
  parentType: string;
  property: string;
  arcValues: Array<any>;
  provDomain: { [key: string]: URL };
}

export class InArcsGroup extends React.Component<InArcsGroupPropType> {
  constructor(props: InArcsGroupPropType) {
    super(props);
    this.state = {
      showMore: false,
    };
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
      <div className="card">
        <div id={this.props.parentType} className="arc-group-title">
          <strong>
            <span>
              <span className="mp">{this.props.parentType}</span> of{" "}
              {this.props.nodeName}
            </span>
          </strong>
        </div>
        <table className="node-table">
          <tbody>
            {arcValues.map((arcValue, index) => {
              return (
                <tr key={this.props.property + index}>
                  <td className="property-column" width="25%">
                    <a href={"/browser/browser2/" + this.props.property}>
                      {this.props.property}
                    </a>{" "}
                    of
                  </td>
                  <td width="50%">
                    {arcValue.dcid ? (
                      <a href={"/browser/browser2/" + arcValue.dcid}>
                        {arcValue.name ? arcValue.name : arcValue.dcid}
                      </a>
                    ) : (
                      <span className="out-arc-text">{arcValue.value}</span>
                    )}
                  </td>
                  <td width="25%">
                    <a href={"/browser/browser2/" + arcValue.provenanceId}>
                      {this.props.provDomain[arcValue.provenanceId]}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}
