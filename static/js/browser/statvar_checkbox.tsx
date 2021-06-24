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
 * Component for rendering a stat var checkbox in the stat var hierarchy.
 */

import React from "react";

import { StatVarInfo } from "./types";
import { Context, ContextType } from "../shared/context";

interface StatVarCheckboxPropType {
  path: string[];
  statVar: StatVarInfo;
  selected: boolean;
}

interface StatVarCheckboxStateType {
  checked: boolean;
}

export class StatVarCheckbox extends React.Component<
  StatVarCheckboxPropType,
  StatVarCheckboxStateType
> {
  context: ContextType;
  constructor(props: StatVarCheckboxPropType) {
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

  componentDidUpdate(prevProps: StatVarCheckboxPropType): void {
    if (this.props !== prevProps) {
      this.setState({
        checked: this.isChecked(),
      });
    }
  }

  private isChecked(): boolean {
    return this.props.selected || this.props.statVar.id in this.context.svPath;
  }

  private handleInputChange(): void {
    this.context.togglePath(this.props.statVar.id, this.props.path);
    this.setState({
      checked: !this.state.checked,
    });
  }

  render(): JSX.Element {
    return (
      <form
        className={
          this.props.selected
            ? "highlighted-node-title node-title"
            : "node-title"
        }
      >
        <label>
          <input
            type="checkbox"
            checked={this.state.checked}
            onChange={this.handleInputChange}
          />{" "}
          {this.props.statVar.displayName}
        </label>
      </form>
    );
  }
}

StatVarCheckbox.contextType = Context;
