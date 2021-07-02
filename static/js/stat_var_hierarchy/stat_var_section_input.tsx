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
 * Component for rendering a stat var section input (checkbox or radio button)
 * in the stat var hierarchy.
 */

import React from "react";
import * as d3 from "d3";

import { StatVarHierarchyType, StatVarInfo } from "../shared/types";
import { Context, ContextType } from "../shared/context";
import { hideTooltip, showTooltip } from "./util";

interface StatVarSectionInputPropType {
  path: string[];
  statVar: StatVarInfo;
  selected: boolean;
}

interface StatVarSectionInputStateType {
  checked: boolean;
}

export class StatVarSectionInput extends React.Component<
  StatVarSectionInputPropType,
  StatVarSectionInputStateType
> {
  context: ContextType;
  constructor(props: StatVarSectionInputPropType) {
    super(props);
    this.state = {
      checked: false,
    };
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  componentDidMount(): void {
    this.setState({
      checked: this.isChecked(),
    });
  }

  componentDidUpdate(prevProps: StatVarSectionInputPropType): void {
    if (this.props !== prevProps) {
      this.setState({
        checked: this.isChecked(),
      });
    }
  }

  private isChecked(): boolean {
    return this.props.statVar.id in this.context.svPath;
  }

  private handleInputChange(): void {
    this.context.togglePath(this.props.statVar.id, this.props.path);
    this.setState({
      checked: !this.state.checked,
    });
  }

  render(): JSX.Element {
    const inputType =
      this.context.statVarHierarchyType === StatVarHierarchyType.MAP
        ? "radio"
        : "checkbox";
    const sectionId = this.props.statVar.id + this.props.path.join("-");
    let className = "node-title";
    if (!this.props.statVar.hasData) {
      className = "node-title node-no-data";
    } else if (this.props.selected) {
      className = "node-title highlighted-node-title";
    }
    return (
      <form className={className}>
        <input
          id={sectionId}
          name="stat-var-hierarchy"
          type={inputType}
          checked={this.state.checked}
          onChange={this.handleInputChange}
          disabled={!this.props.statVar.hasData}
        />
        <label
          className={this.state.checked ? "selected-node-title" : ""}
          htmlFor={sectionId}
          onMouseMove={
            !this.props.statVar.hasData ? this.mouseMoveAction : null
          }
          onMouseOut={() => hideTooltip()}
        >
          {this.props.statVar.displayName}
        </label>
      </form>
    );
  }

  private mouseMoveAction = (e) => {
    if (this.props.statVar.hasData) {
      return;
    }
    const html = "placeholder";
    const left = e.pageX;
    const topOffset = 10;
    const containerY = (d3
      .select("#explore")
      .node() as HTMLElement).getBoundingClientRect().y;
    const top = e.pageY - containerY + topOffset;
    showTooltip(html, { left, top });
  };
}

StatVarSectionInput.contextType = Context;
