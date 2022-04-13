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

/**
 * Info page before a chart is shown.
 */

import React from "react";

function Info(): JSX.Element {
  return (
    <div id="placeholder-container">
      <p>
        The scatter plot tool helps you visualize the correlation between two
        statistical variables that appear in the pane to the left.
      </p>
      <ol>
        <li>
          Enter a place in the search box and then select the type of places you
          want to plot in the dropdown menu above.
        </li>
        <li>
          Pick two statistical variables in the left pane. There are thousands
          of statistical variables to choose from, arranged in a topical
          hierarchy.
        </li>
      </ol>
      <p>Or you can start your exploration from these interesting points ...</p>
      <ul>
        <li>
          <b>
            Prevalence Of Coronary Heart Disease vs. Projected Temperature Rise
            (RCP 4.5)
          </b>{" "}
          for counties in{" "}
          <a
            href={
              "#&svx=DifferenceRelativeToBaseDate2006_Max_Temperature_RCP45&svy=Percent_Person_WithCoronaryHeartDisease&epd=country/USA&ept=County&qd=1&dd=1"
            }
          >
            USA
          </a>
          ,{" "}
          <a
            href={
              "#&svx=DifferenceRelativeToBaseDate2006_Max_Temperature_RCP45&svy=Percent_Person_WithCoronaryHeartDisease&epd=geoId/12&ept=County"
            }
          >
            Florida
          </a>
        </li>
        <li>
          <b>Population in Poverty Per Capita vs. Mean Solar Insolation</b> for
          counties in{" "}
          <a
            href={
              "#&svx=Mean_SolarInsolation&svy=Count_Person_BelowPovertyLevelInThePast12Months&pcy=1&dy=Count_Person&epd=country/USA&ept=County&ct=1"
            }
          >
            USA
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Mean_SolarInsolation&svy=Count_Person_BelowPovertyLevelInThePast12Months&pcy=1&dy=Count_Person&epd=geoId/06&ept=County&ct=1"
            }
          >
            California
          </a>
        </li>
        <li>
          <b>
            Water Withdrawal for Irrigation vs. Projected Temperature Rise (RCP
            4.5)
          </b>{" "}
          for counties in{" "}
          <a
            href={
              "#&svx=DifferenceRelativeToBaseDate2006_Max_Temperature_RCP45&svy=WithdrawalRate_Water_Irrigation&epd=country/USA&ept=County&ct=1"
            }
          >
            USA
          </a>
          ,{" "}
          <a
            href={
              "#&svx=DifferenceRelativeToBaseDate2006_Max_Temperature_RCP45&svy=WithdrawalRate_Water_Irrigation&epd=geoId/06&ept=County&ct=1"
            }
          >
            California
          </a>
        </li>
        <li>
          <b>Literate Population Per Capita vs. Schools Per Capita</b> for
          states in{" "}
          <a
            href={
              "#&svx=Count_School&pcx=1&dx=Count_Person&svy=Count_Person_Literate&pcy=1&dy=Count_Person&epd=country/IND&ept=AdministrativeArea1&ct=1"
            }
          >
            India
          </a>
        </li>
        <li>
          <b>Asians Per Capita vs. Median Income</b> for counties in{" "}
          <a
            href={
              "#&svx=Median_Income_Person&svy=Count_Person_AsianAlone&pcy=1&dy=Count_Person&epd=geoId/06&ept=County"
            }
          >
            California
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Median_Income_Person&svy=Count_Person_AsianAlone&pcy=1&dy=Count_Person&epd=geoId/48&ept=County"
            }
          >
            Texas
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Median_Income_Person&svy=Count_Person_AsianAlone&pcy=1&dy=Count_Person&epd=geoId/17&ept=County"
            }
          >
            Illinois
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Median_Income_Person&svy=Count_Person_AsianAlone&pcy=1&dy=Count_Person&epd=country/USA&ept=County"
            }
          >
            USA
          </a>
        </li>
        <li>
          <b>
            Bachelor&apos;s Degree Attainment vs. Female Population Per Capita
          </b>{" "}
          for counties in{" "}
          <a
            href={
              "#&svx=Count_Person_Female&pcx=1&dx=Count_Person&svy=Count_Person_EducationalAttainmentBachelorsDegree&pcy=1&dy=Count_Person&epd=geoId/06&ept=County"
            }
          >
            California
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Count_Person_Female&pcx=1&dx=Count_Person&svy=Count_Person_EducationalAttainmentBachelorsDegree&pcy=1&dy=Count_Person&epd=geoId/36&ept=County"
            }
          >
            New York
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Count_Person_Female&pcx=1&dx=Count_Person&svy=Count_Person_EducationalAttainmentBachelorsDegree&pcy=1&dy=Count_Person&epd=geoId/56&ept=County"
            }
          >
            Wyoming
          </a>
        </li>
        <li>
          <b>Covid-19 Cases vs. Population of African Americans Per Capita</b> for{" "}
          <a
            href={
              "#&svx=Count_Person_BlackOrAfricanAmericanAlone&pcx=1&dx=Count_Person&svy=CumulativeCount_MedicalConditionIncident_COVID_19_ConfirmedOrProbableCase&pcy=1&dy=Count_Person&epd=country/USA&ept=State"
            }
          >
            US states
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Count_Person_BlackOrAfricanAmericanAlone&pcx=1&dx=Count_Person&svy=CumulativeCount_MedicalConditionIncident_COVID_19_ConfirmedOrProbableCase&pcy=1&dy=Count_Person&epd=country/USA&ept=County"
            }
          >
            US counties
          </a>
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

export { Info };
