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

import React, { Component } from "react";
import { Menu } from "../statsvar_menu";
import { StatsVarFilterInterface } from "../commons";

interface StatVarChooserPropType {
  selectedStatVar: string;
  selectedNodePath: string[];
  statsVarFilter: StatsVarFilterInterface;
  reportStatVar: (statVar: string, nodePath: string[]) => void;
}

interface StatVarChooserStateType {
  statVarToNodePath: Record<string, string[]>;
}

class StatVarChooser extends Component<
  StatVarChooserPropType,
  StatVarChooserStateType
> {
  constructor(props: StatVarChooserPropType) {
    super(props);
    this.state = { statVarToNodePath: {} };
  }

  render(): JSX.Element {
    return (
      <div className="explore-menu-container">
        <Menu
          selectedNodes={{
            [this.props.selectedStatVar]: [this.props.selectedNodePath],
          }}
          statsVarFilter={this.props.statsVarFilter}
          setStatsVarTitle={(input) => {
            console.log("setStatsVarTitle");
            console.log(input.toString());
          }}
          addStatsVar={this.addStatVar.bind(this)}
          removeStatsVar={this.removeStatVar.bind(this)}
        ></Menu>
        <button onClick={this.confirmSelection.bind(this)}>Confirm</button>
      </div>
    );
  }

  addStatVar(statVar: string, nodePath: string[]): void {
    console.log(`addStatVar ${statVar}`);
    console.log(this.state.statVarToNodePath);
    this.setState({
      statVarToNodePath: {
        ...this.state.statVarToNodePath,
        [statVar]: nodePath,
      },
    });
  }

  removeStatVar(statVar: string): void {
    console.log(`removeStatVar ${statVar}`);
    console.log(this.state.statVarToNodePath);
    const newStatVarToNodePath = Object.assign(
      {},
      this.state.statVarToNodePath
    );
    delete newStatVarToNodePath[statVar];
    this.setState({
      statVarToNodePath: newStatVarToNodePath,
    });
  }

  confirmSelection(): void {
    const selected = Object.keys(this.state.statVarToNodePath);
    if (selected.length === 0) {
      alert("Please choose one");
    } else if (selected.length === 1) {
      console.log(`Confirming ${selected[0]}`);
      this.props.reportStatVar(
        selected[0],
        this.state.statVarToNodePath[selected[0]]
      );
    } else {
      alert("Please choose only one");
    }
  }
}

export { StatVarChooser };
