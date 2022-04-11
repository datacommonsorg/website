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

class Info extends Component {
  render(): JSX.Element {
    return (
      <div id="placeholder-container">
        <p>
          The timelines tool helps you explore trends for the statistical
          variables that appear in the pane to the left. Enter a place --- city,
          state, zip, county, country --- in the search box above and then pick
          one or more statistical variables in the pane. There are thousands of
          statistical variables to choose from, arranged in a topical hierarchy.
        </p>
        <p>
          Or you can start your exploration from these interesting points ...
        </p>
        <ul>
          <li>
            <b>Withdrawal Rates</b> for
            <a
              href={
                "#place=geoId%2F06&statsVar=WithdrawalRate_Water_Thermoelectric__WithdrawalRate_Water_PublicSupply__WithdrawalRate_Water_Irrigation__WithdrawalRate_Water_Aquaculture"
              }
            >
              {" "}
              California
            </a>
            ,
            <a
              href={
                '#place=geoId%2F06025&statsVar=WithdrawalRate_Water_Irrigation__WithdrawalRate_Water_Irrigation_FreshWater_GroundWater__WithdrawalRate_Water_Irrigation_SurfaceWater&chart=%7B"withdrawalRate"%3A%7B"pc"%3Afalse%2C"delta"%3Afalse%7D%7D'
              }
            >
              {" "}
              Imperial County
            </a>
          </li>
          <li>
            <b>University towns</b> by
            <a
              href={
                "#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Median_Age_Person"
              }
            >
              {" "}
              age
            </a>
            ,
            <a
              href={
                "#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Median_Income_Person"
              }
            >
              {" "}
              income
            </a>
            ,
            <a
              href={
                "#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Count_CriminalActivities_ViolentCrime"
              }
            >
              {" "}
              crime
            </a>
          </li>
          <li>
            <b>Close by but very different</b>
            <br />
            <span>
              Berkeley &amp; Piedmont:
              <a
                href={
                  "#place=geoId%2F0606000%2CgeoId%2F0656938&statsVar=Count_Person_BelowPovertyLevelInThePast12Months&chart=%7B%22count%22%3A%7B%22pc%22%3Atrue%2C%22denom%22%3A%22Count_Person%22%7D%7D"
                }
              >
                {" "}
                poverty
              </a>
              ,
              <a
                href={
                  "#&&place=geoId/0606000,geoId/0656938&statsVar=Count_Person_18To24Years__Count_Person_35To44Years__Count_Person_45To54Years__Count_Person_65To74Years"
                }
              >
                {" "}
                age distribution
              </a>
              ,
              <a
                href={
                  "#&&place=geoId/0606000,geoId/0656938&pc=1&statsVar=Count_Person_EducationalAttainmentBachelorsDegree__Count_Person_EducationalAttainmentMastersDegree__Count_Person_EducationalAttainmentDoctorateDegree&chart=%7B%22count%22%3A%7B%22denom%22%3A%22Count_Person%22%7D%7D"
                }
              >
                {" "}
                education
              </a>
            </span>
            <br />
            <span>
              Palo Alto &amp; East Palo Alto:
              <a
                href={
                  "#&&place=geoId/0655282,geoId/0620956&statsVar=Count_Person_AsianAlone__Count_Person_BlackOrAfricanAmericanAlone__Count_Person_NativeHawaiianOrOtherPacificIslanderAlone__Count_Person_WhiteAlone&chart=%7B%22count%22%3A%7B%22pc%22%3Atrue%2C%22denom%22%3A%22Count_Person%22%7D%7D"
                }
              >
                {" "}
                race
              </a>
              ,
              <a
                href={
                  "#&&place=geoId/0655282,geoId/0620956&&statsVar=Median_Income_Person"
                }
              >
                {" "}
                income
              </a>
              ,
              <a
                href={
                  "#&&place=geoId/0655282,geoId/0620956&pc=1&statsVar=Count_Person_Employed&chart=%7B%22count%22%3A%7B%22denom%22%3A%22Count_Person%22%7D%7D"
                }
              >
                {" "}
                employment
              </a>
              ,
              <a
                href={
                  "#&&place=geoId/0655282,geoId/0620956&pc=1&statsVar=Count_Person_Divorced__Count_Person_MarriedAndNotSeparated__Count_Person_NeverMarried&chart=%7B%22count%22%3A%7B%22denom%22%3A%22Count_Person%22%7D%7D"
                }
              >
                {" "}
                marital status
              </a>
            </span>
          </li>
          <li>
            <b>Extremes</b> <br />
            <span>
              Santa Clara County vs Imperial County:
              <a
                href={
                  "#&&place=geoId/06085,geoId/06025&statsVar=Median_Income_Person"
                }
              >
                {" "}
                Richest vs. Poorest CA counties
              </a>
              ,
              <a
                href={
                  "#&&place=geoId/06085,geoId/06025&statsVar=Count_Death_DiseasesOfTheCirculatorySystem__Count_Death_ExternalCauses"
                }
              >
                {" "}
                Cause of Death
              </a>
            </span>
            <br />
            <span>
              Atlanta vs West Jordan:
              <a
                href={
                  "#&&place=geoId/1304000,geoId/4982950&statsVar=Median_Income_Person"
                }
              >
                {" "}
                Highest vs Lowest Income Disparity
              </a>
              ,
              <a
                href={
                  "#&&place=geoId/1304000,geoId/4982950&pc=1&statsVar=Count_Person_Female__Count_Person_Male&chart=%7B%22count%22%3A%7B%22denom%22%3A%22Count_Person%22%7D%7D"
                }
              >
                {" "}
                gender balance
              </a>
            </span>
          </li>
        </ul>
        <p>Take the data and use it on your site!</p>
        <p>
          <a href="mailto:collaborations@datacommons.org">Send</a> us your
          discoveries!
        </p>
      </div>
    );
  }
}

export { Info };
