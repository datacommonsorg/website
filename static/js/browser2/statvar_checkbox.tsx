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

import { Context } from "../shared/context";

interface StatVarCheckboxPropType {
  statVar: string;
  selected: boolean;
}

interface StatVarCheckboxStateType {
  checked: boolean;
}

export class StatVarCheckbox extends React.Component<
  StatVarCheckboxPropType,
  StatVarCheckboxStateType
> {
  constructor(props: StatVarCheckboxPropType) {
    super(props);
    this.state = {
      checked: false,
    };
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  componentDidMount(): void {
    if (this.props.selected || this.props.statVar in this.context.statVarPath) {
      this.setState({ checked: true });
    }
  }

  private handleInputChange(): void {
    this.context.toggleStatVarPath(
      this.props.statVar,
      this.context.getPath(this.props.statVar)
    );
    this.setState({
      checked: !this.state.checked,
    });
  }

  render(): JSX.Element {
    return (
      <form>
        <label>
          {this.props.statVar}
          <input
            type="checkbox"
            checked={this.state.checked}
            onChange={this.handleInputChange}
          />
        </label>
      </form>
    );
  }
}

StatVarCheckbox.contextType = Context;
