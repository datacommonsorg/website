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
import { ScatterInfo } from "./scatter2_info";
import { SearchBar } from "../timeline_search";
import {
  getChildPlaces,
  ApiPlaceInfo,
  getTimeSeriesLatestPoint,
} from "./scatter2_util";
import { getPlaceNames } from "../timeline_util";
import { ChildPlaceTypeFilter } from "./scatter2_filter";
import { StatVarChooser } from "./scatter2_statvar";
import { NoopStatsVarFilter } from "../commons";
import { ScatterChart } from "./scatter2_chart";

interface ScatterPageState {
  placeDcid: string;
  dcidToName: Record<string, string>;
  typeToChildren: Record<string, ApiPlaceInfo[]>;
  pickStatVarX: boolean;
  pickStatVarY: boolean;
  statVarX: string;
  statVarY: string;
  dataX: number[];
  dataY: number[];
}

class ScatterPage extends Component<unknown, ScatterPageState> {
  constructor(props: unknown) {
    super(props);
    this.state = {
      placeDcid: "",
      typeToChildren: {},
      dcidToName: {},
      pickStatVarX: false,
      pickStatVarY: false,
      statVarX: "",
      statVarY: "",
      dataX: [],
      dataY: [],
    };
  }

  render(): JSX.Element {
    return (
      <div>
        {/* TODO(intrepiditee): Modify the placeholder text to reflect that only one place can be selected. */}
        <SearchBar
          places={this.state.dcidToName}
          addPlace={this.setPlace.bind(this)}
          removePlace={this.unsetPlace.bind(this)}
        ></SearchBar>

        {this.state.placeDcid ? null : <ScatterInfo></ScatterInfo>}

        {this.state.placeDcid ? (
          <div>
            <ChildPlaceTypeFilter
              typeToChildren={this.state.typeToChildren}
            ></ChildPlaceTypeFilter>

            <button onClick={() => this.pickStatVar(true)}>
              Choose Statistical Variable for X-Axis
            </button>
            <button onClick={() => this.pickStatVar(false)}>
              Choose Statistical Variable for Y-Axis
            </button>

            <div>
              X: {this.state.statVarX ? this.state.statVarX : "Not chosen"}
            </div>
            <div>
              Y: {this.state.statVarY ? this.state.statVarY : "Not chosen"}
            </div>

            {this.state.pickStatVarX || this.state.pickStatVarY ? (
              <StatVarChooser
                statsVarFilter={new NoopStatsVarFilter()}
                selectedStatVar=""
                selectedNodePath={[]}
                reportStatVar={((statVar: string, nodePath: string[]) =>
                  this.setStatVar(
                    statVar,
                    nodePath,
                    this.state.pickStatVarX
                  )).bind(this)}
              ></StatVarChooser>
            ) : null}

            {this.state.dataX.length && this.state.dataY.length ? (
              <ScatterChart
                data={this.state.dataX.map((value, i) => [
                  value,
                  this.state.dataY[i],
                ])}
              ></ScatterChart>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  async setPlace(dcid: string): Promise<void> {
    Promise.all([getPlaceNames([dcid]), getChildPlaces(dcid)]).then(
      ([dcidToName, typeToChildren]) => {
        this.setState({
          placeDcid: dcid,
          dcidToName: dcidToName,
          typeToChildren: typeToChildren,
        });
      }
    );

    console.log(`Set place to <${this.state.dcidToName[dcid]}, ${dcid}>`);
    console.log(this.state.typeToChildren);
  }

  unsetPlace(): void {
    this.setState({ placeDcid: "", dcidToName: {}, typeToChildren: {} });
  }

  pickStatVar(xAxis: boolean): void {
    console.log(`Picking StatVar for ${xAxis ? "x" : "y"}-axis`);
    this.setState({ pickStatVarX: xAxis, pickStatVarY: !xAxis });
  }

  setStatVar(statVar: string, nodePath: string[], xAxis: boolean): void {
    console.log(`Setting StatVar ${statVar} for ${xAxis ? "x" : "y"}-axis`);
    this.setState({
      statVarX: xAxis ? statVar : this.state.statVarX,
      statVarY: xAxis ? this.state.statVarY : statVar,
      pickStatVarX: false,
      pickStatVarY: false,
    });
  }

  componentDidUpdate(_prevProps: unknown, prevState: ScatterPageState): void {
    if (
      (this.state.statVarX && prevState.statVarX != this.state.statVarX) ||
      (this.state.statVarY && prevState.statVarY != this.state.statVarY)
    ) {
      this.loadData(prevState.statVarX != this.state.statVarX);
    }
  }

  async loadData(xAxis: boolean): Promise<void> {
    const types = Object.keys(this.state.typeToChildren);
    const type = types[0];
    const children = this.state.typeToChildren[type];

    Promise.all(
      children.map((place) =>
        getTimeSeriesLatestPoint(
          place.dcid,
          xAxis ? this.state.statVarX : this.state.statVarY
        )
      )
    ).then((data) => {
      console.log(`loadData ${data}`);
      this.setState({
        dataX: xAxis ? data : this.state.dataX,
        dataY: xAxis ? this.state.dataY : data,
      });
    });
  }
}

export { ScatterPage };
