/**
 * Copyright 2021 Google LLC
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
 * Component for rendering the header of a stat var node.
 */

import React from "react";

import { Context, ContextType } from "../shared/context";
import { StatVarHierarchyNodeType } from "../shared/types";
import { StatVarHierarchyType } from "../shared/types";

const BULLET_POINT_HTML = <span className="bullet">&#8226;</span>;
const DOWN_ARROW_HTML = <i className="material-icons">remove</i>;
const RIGHT_ARROW_HTML = <i className="material-icons">add</i>;

interface StatVarHierarchyNodeHeaderPropType {
  childrenStatVarCount: number;
  selectionCount: number;
  title: string;
  opened: boolean;
  highlighted: boolean;
  nodeType: StatVarHierarchyNodeType;
}

export class StatVarHierarchyNodeHeader extends React.Component<StatVarHierarchyNodeHeaderPropType> {
  context: ContextType;

  render(): JSX.Element {
    let prefixHtml =
      this.props.nodeType === StatVarHierarchyNodeType.STAT_VAR
        ? BULLET_POINT_HTML
        : null;
    if (this.props.nodeType === StatVarHierarchyNodeType.STAT_VAR_GROUP) {
      prefixHtml = this.props.opened ? DOWN_ARROW_HTML : RIGHT_ARROW_HTML;
    }
    const showSelectionCount =
      this.context.statVarHierarchyType !== StatVarHierarchyType.BROWSER &&
      this.props.selectionCount > 0;

    let className = "title";
    if (!this.props.childrenStatVarCount) {
      className += " node-no-data";
    }
    if (showSelectionCount) {
      className += " selected-node-title";
    }
    return (
      <div
        className={
          this.props.highlighted
            ? "node-title highlighted-node-title"
            : "node-title"
        }
      >
        {prefixHtml}
        <span className={className}>
          {this.props.title}
          {this.props.childrenStatVarCount > 0 &&
            this.props.nodeType !== StatVarHierarchyNodeType.STAT_VAR && (
              <span className="sv-count">
                ({this.props.childrenStatVarCount})
              </span>
            )}
        </span>
      </div>
    );
  }
}
StatVarHierarchyNodeHeader.contextType = Context;
