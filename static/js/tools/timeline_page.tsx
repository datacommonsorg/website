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
import { parseStatVarPath, parsePlace, getTriples} from "./timeline_util";
import { SearchBar } from "./timeline_search";
import { Menu } from "./statsvar_menu";
import { ChartRegion, ChartRegionPropsType } from "./timeline_chart";


interface PagePropType {
  search: boolean;
  updateUrl: (statvar: string, shouldAdd: boolean) => void;
}

interface PageStateType {
  statvarPaths: string[][];
  svTriples: {};
  placeList: {} /*{placeId: placeName}*/;
}

class Page extends Component<PagePropType, PageStateType> {
  constructor(props: PagePropType) {
    super(props);
    this.handleHashChange = this.handleHashChange.bind(this);
    this.state = {
      statvarPaths: parseStatVarPath(),
      svTriples:{},
      placeList: {},
    };
  }

  componentDidMount() {
    window.addEventListener("hashchange", this.handleHashChange);
    this.handleHashChange();
  }

  handleHashChange() {
    const svPaths = parseStatVarPath[0];
    const svIds = parseStatVarPath[1];
    const triplesPromise = getTriples(svIds);
    const placesPromise = parsePlace();
    if (placesPromise === null) {
      this.setState({
        placeList: {},
      });
    } else {
      placesPromise.then((places) => {
        this.setState({
          placeList: places,
        });
      });
    }
    triplesPromise.then((triples) =>{
      this.setState({
        svTriples: triples,
      });
    })
    this.setState({
      statvarPaths: svPaths,
    });
  }

  render() {


    return (
      <div>
        <div id="search">
          <SearchBar placeList={this.state.placeList} />
        </div>
        <div id="timeline-lower-pane">
          <div className="explore-menu-container" id="explore">
            <Menu
              updateUrl={this.props.updateUrl}
              search={this.props.search}
              svPaths={this.state.statvarPaths}
            ></Menu>
          </div>
          <div id="chart-region">
            <ChartRegion
              chartElem="charts"
              placeIds={["geoId/05", "geoId/06"]}
              statVarsAndMeasuredProps={[
                ["Count_Person", "count"],
                ["Count_Person_Male", "count"],
                ["Median_Age_Person", "age"],
              ]}
              perCapita={false}>
            </ChartRegion>
          </div>
        </div>

      </div>
    );
  }
}
export { Page };
