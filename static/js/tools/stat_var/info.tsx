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
 * Default content for Stat Var Explorer when no stat var is selected.
 */

import React, { Component } from "react";

class Info extends Component {
  render(): JSX.Element {
    return (
      <div id="placeholder-container">
        <p>
          The statistical variable explorer provides information about each
          statistical variable, such as variable metadata, observations, etc.
          Select a variable from the panel on the left to get started, or select
          a <a href="https://docs.datacommons.org/datasets/">data source</a>{" "}
          above to filter by. There are thousands of statistical variables to
          choose from, arranged in a topical hierarchy.
        </p>
        <p>
          Or you can start your exploration with these statistical variables ...
        </p>
        <ul>
          <li>
            <a href="#sv=Count_Person">Population</a>
          </li>
          <li>
            <a href="#sv=CumulativeCount_Vaccine_COVID_19_Administered">
              Cumulative Count of COVID_19, Vaccine Administered
            </a>
          </li>
          <li>
            <a href="#sv=PrecipitationRate_RCP85">
              Precipitation Rate Based on RCP 8.5
            </a>
          </li>
          <li>
            <a href="#sv=Annual_Consumption_Electricity">
              Annual Consumption of Electricity
            </a>
          </li>
          <li>
            <a href="#sv=GiniIndex_EconomicActivity">
              Gini Index of Economic Activity
            </a>
          </li>
        </ul>
      </div>
    );
  }
}

export { Info };
