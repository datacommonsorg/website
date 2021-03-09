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

const HREF_PREFIX = "/browser2/";

interface ArcTableRowProps {
  propertyLabel: string;
  valueDcid?: string;
  valueText: string;
  provenanceId?: string;
  src: URL;
}
export class ArcTableRow extends React.Component<ArcTableRowProps> {
  render(): JSX.Element {
    return (
      <tr>
        <td className="property-column" width="25%">
          <a href={HREF_PREFIX + this.props.propertyLabel}>
            {this.props.propertyLabel}
          </a>
        </td>
        <td width="50%">
          {this.props.valueDcid ? (
            <a href={HREF_PREFIX + this.props.valueDcid}>
              {this.props.valueText}
            </a>
          ) : (
            <span className="out-arc-text">{this.props.valueText}</span>
          )}
        </td>
        <td width="25%">
          {this.props.provenanceId && (
            <a href={HREF_PREFIX + this.props.provenanceId}>{this.props.src}</a>
          )}
        </td>
      </tr>
    );
  }
}
