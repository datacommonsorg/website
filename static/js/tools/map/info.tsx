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
 * Info page before a chart is shown.
 */

import React, { useContext } from "react";

import { Context } from "./context";
import { ifShowChart } from "./util";

export function Info(): JSX.Element {
  const { statVar, placeInfo } = useContext(Context);

  // TODO(chejennifer): add examples
  return (
    <>
      {!ifShowChart(statVar.value, placeInfo.value) && (
        <div id="placeholder-container">
          <p>
            The map explorer helps you visualize how a statistical variable from
            the pane to the left can vary across geographic regions.
          </p>
          <ol>
            <li>
              Enter a place in the search box and then select the type of places
              you want to plot in the dropdown menu above.
            </li>
            <li>
              Pick a statistical variable in the left pane. There are thousands
              of statistical variables to choose from, arranged in a topical
              hierarchy.
            </li>
          </ol>
          <p>
            Or you can start your exploration from these interesting points ...
          </p>
          <ul>
            <li>
              <b>Projected Temperature Rise (RCP 4.5)</b> across counties in{" "}
              <a
                href={
                  "#%26sv%3DDifferenceRelativeToBaseDate2006_Max_Temperature_RCP45%26pc%3D0%26pd%3Dcountry%2FUSA%26ept%3DCounty"
                }
              >
                USA
              </a>
              ,{" districts in "}
              <a
                href={
                  "#%26sv%3DDifferenceRelativeToBaseDate2006_Max_Temperature_RCP45%26pc%3D0%26pd%3Dcountry%2FIND%26ept%3DAdministrativeArea2"
                }
              >
                India
              </a>
            </li>
            <li>
              <b>Annual Non-Biogenic Carbon Dioxide Emissions</b> across states
              in{" "}
              <a
                href={
                  "#%26sv%3DAnnual_Emissions_CarbonDioxide_NonBiogenic%26pc%3D0%26pd%3Dcountry%2FUSA%26ept%3DState%26ppt%3DEpaReportingFacility"
                }
              >
                USA
              </a>
              ,{" facilities in "}
              <a
                href={
                  "#%26sv%3DAnnual_Emissions_CarbonDioxide_NonBiogenic%26pc%3D0%26pd%3DgeoId%2F48%26ppt%3DEpaReportingFacility%26mp%3D1"
                }
              >
                Texas
              </a>
            </li>
            <li>
              <b>Water Withdrawal Rate</b> across counties in{" "}
              <a
                href={
                  "#%26sv%3DWithdrawalRate_Water%26pc%3D0%26pd%3Dcountry%2FUSA%26ept%3DCounty"
                }
              >
                USA
              </a>
              ,{" "}
              <a
                href={
                  "#%26sv%3DWithdrawalRate_Water%26pc%3D0%26pd%3DgeoId%2F06%26ept%3DCounty"
                }
              >
                California
              </a>
            </li>
            <li>
              <b>Median Age</b> across counties in{" "}
              <a href={"#&sv=Median_Age_Person&pc=0&pd=country/USA&ept=County"}>
                USA
              </a>
              ,{" "}
              <a href={"#&sv=Median_Age_Person&pc=0&pd=geoId/06&ept=County"}>
                California
              </a>
              ,{" "}
              <a href={"#&sv=Median_Age_Person&pc=0&pd=geoId/12&ept=County"}>
                Florida
              </a>
              ,{" "}
              <a href={"#&sv=Median_Age_Person&pc=0&pd=geoId/36&ept=County"}>
                New York
              </a>
            </li>
            <li>
              <b>Median Income</b> across counties in{" "}
              <a
                href={
                  "#&sv=Median_Income_Person&pc=0&pd=country/USA&ept=County"
                }
              >
                USA
              </a>
              ,{" "}
              <a href={"#&sv=Median_Income_Person&pc=0&pd=geoId/36&ept=County"}>
                New York
              </a>
              ,{" "}
              <a href={"#&sv=Median_Income_Person&pc=0&pd=geoId/48&ept=County"}>
                Texas
              </a>
              ,{" "}
              <a href={"#&sv=Median_Income_Person&pc=0&pd=geoId/53&ept=County"}>
                Washington
              </a>
            </li>
            <li>
              <b>Attainment of Bachelor&apos;s Degree or Higher</b> across
              counties in{" "}
              <a
                href={
                  "#&sv=Count_Person_EducationalAttainmentBachelorsDegreeOrHigher&pc=1&denom=Count_Person&pd=country/USA&ept=County"
                }
              >
                USA
              </a>
              ,{" "}
              <a
                href={
                  "#&sv=Count_Person_EducationalAttainmentBachelorsDegreeOrHigher&pc=1&denom=Count_Person&pd=geoId/53&ept=County"
                }
              >
                Washington
              </a>
              ,{" "}
              <a
                href={
                  "#&sv=Count_Person_EducationalAttainmentBachelorsDegreeOrHigher&pc=1&denom=Count_Person&pd=geoId/17&ept=County"
                }
              >
                Illinois
              </a>
              ,{" "}
              <a
                href={
                  "#&sv=Count_Person_EducationalAttainmentBachelorsDegreeOrHigher&pc=1&denom=Count_Person&pd=geoId/08&ept=County"
                }
              >
                Colorado
              </a>
            </li>
            <li>
              <b>Unemployment Rate</b> across counties in{" "}
              <a
                href={
                  "#&sv=UnemploymentRate_Person&pc=0&pd=country/USA&ept=County"
                }
              >
                USA
              </a>
              ,{" "}
              <a
                href={
                  "#&sv=UnemploymentRate_Person&pc=0&pd=geoId/48&ept=County"
                }
              >
                Texas
              </a>
              ,{" "}
              <a
                href={
                  "#&sv=UnemploymentRate_Person&pc=0&pd=geoId/06&ept=County"
                }
              >
                California
              </a>
              ,{" "}
              <a
                href={
                  "#&sv=UnemploymentRate_Person&pc=0&pd=geoId/34&ept=County"
                }
              >
                New Jersey
              </a>
            </li>
            <li>
              <b>Distribution across states in the US</b> for{" "}
              <a href={"#&sv=Median_Age_Person&pc=0&pd=country/USA&ept=State"}>
                Median Age
              </a>
              ,{" "}
              <a
                href={
                  "#&sv=Count_Person_EducationalAttainmentNoSchoolingCompleted&pc=1&denom=Count_Person&pd=country/USA&ept=State"
                }
              >
                No Schooling Completed
              </a>
              ,{" "}
              <a
                href={"#&sv=Median_Income_Person&pc=0&pd=country/USA&ept=State"}
              >
                Median Income
              </a>
            </li>
            <li>
              <b>Greenhouse Gas Emissions</b> across{" "}
              <a
                href={
                  "#&sv=Annual_Emissions_GreenhouseGas_NonBiogenic&pc=0&pd=country/USA&ept=State&ppt=EpaReportingFacility"
                }
              >
                states in USA
              </a>
              ,{" "}
              <a
                href={
                  "#&sv=Annual_Emissions_GreenhouseGas_NonBiogenic&pc=0&pd=geoId/06&ept=County&ppt=EpaReportingFacility"
                }
              >
                counties in California
              </a>
              ,{" "}
              <a
                href={
                  "#&sv=Annual_Emissions_GreenhouseGas_NonBiogenic&pc=0&pd=geoId/06029&ept=County&ppt=EpaReportingFacility"
                }
              >
                Kern County
              </a>
            </li>
          </ul>
          <p>Take the data and use it on your site!</p>
          <p>
            <a href="mailto:collaborations@datacommons.org">Send</a> us your
            discoveries!
          </p>
        </div>
      )}
    </>
  );
}
