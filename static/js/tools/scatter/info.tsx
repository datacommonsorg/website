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
            Prevalence Of Coronary Heart Disease vs Max Temperature Relative To
            2006 RCP4.5 Difference Relative To Base Date
          </b>{" "}
          for counties in{" "}
          <a
            href={
              "#%26svx%3DDifferenceRelativeToBaseDate2006_Max_Temperature_RCP45%26svy%3DPercent_Person_WithCoronaryHeartDisease%26epd%3Dcountry%2FUSA%26epn%3DUnited%20States%20of%20America%26epts%3DCountry%26ept%3DCounty%26qd%3D1%26ld%3D0%26dd%3D1%26ct%3D0"
            }
          >
            USA
          </a>
          ,{" "}
          <a
            href={
              "#%26svx%3DDifferenceRelativeToBaseDate2006_Max_Temperature_RCP45%26svy%3DPercent_Person_WithCoronaryHeartDisease%26epd%3DgeoId%2F12%26epn%3DFlorida%26epts%3DState%26ept%3DCounty%26qd%3D0%26ld%3D0%26dd%3D0%26ct%3D0"
            }
          >
            Florida
          </a>
        </li>
        <li>
          <b>
            Below Poverty Level In The Past 12 Months Population Per Capita vs
            Mean Solar Insolation
          </b>{" "}
          for counties in{" "}
          <a
            href={
              "#%26svx%3DMean_SolarInsolation%26svy%3DCount_Person_BelowPovertyLevelInThePast12Months%26pcy%3D1%26epd%3Dcountry%2FUSA%26epn%3DUnited%20States%20of%20America%26epts%3DCountry%26ept%3DCounty%26qd%3D0%26ld%3D0%26dd%3D0%26ct%3D1"
            }
          >
            USA
          </a>
          ,{" "}
          <a
            href={
              "#%26svx%3DMean_SolarInsolation%26svy%3DCount_Person_BelowPovertyLevelInThePast12Months%26pcy%3D1%26epd%3DgeoId%2F06%26epn%3DCalifornia%26epts%3DState%26ept%3DCounty%26qd%3D0%26ld%3D0%26dd%3D0%26ct%3D1"
            }
          >
            California
          </a>
        </li>
        <li>
          <b>Literate Population Per Capita vs Count Of School Per Capita</b>{" "}
          for states in{" "}
          <a
            href={
              "#%26svx%3DCount_School%26pcx%3D1%26svy%3DCount_Person_Literate%26pcy%3D1%26epd%3Dcountry%2FIND%26epn%3DIndia%26epts%3DCountry%26ept%3DAdministrativeArea1%26qd%3D0%26ld%3D0%26dd%3D0%26ct%3D1"
            }
          >
            India
          </a>
        </li>
        <li>
          <b>Asians Per Capita vs Median Income</b> for counties in{" "}
          <a
            href={
              "#&svx=Median_Income_Person&svpx=0-3&svnx=Median_income&svy=Count_Person_AsianAlone&svpy=0-14-1&svdy=Count_Person&svny=Asian_Alone&pcy=1&epd=geoId%2F06&epn=California&epts=State&ept=County"
            }
          >
            California
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Median_Income_Person&svpx=0-3&svnx=Median_income&svy=Count_Person_AsianAlone&svpy=0-14-1&svdy=Count_Person&svny=Asian_Alone&pcy=1&epd=geoId%2F48&epn=Texas&epts=State&ept=County"
            }
          >
            Texas
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Median_Income_Person&svpx=0-3&svnx=Median_income&svy=Count_Person_AsianAlone&svpy=0-14-1&svdy=Count_Person&svny=Asian_Alone&pcy=1&epd=geoId%2F17&epn=Illinois&epts=State&ept=County"
            }
          >
            Illinois
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Median_Income_Person&svpx=0-3&svnx=Median_income&svy=Count_Person_AsianAlone&svpy=0-14-1&svdy=Count_Person&svny=Asian_Alone&pcy=1&epd=country%2FUSA&epn=United%20States%20of%20America&epts=Country&ept=County"
            }
          >
            USA
          </a>
        </li>
        <li>
          <b>Bachelor Degree Attained vs Females Per Capita</b> for counties in{" "}
          <a
            href={
              "#&svx=Count_Person_Female&svpx=0-8-0&svdx=Count_Person&svnx=Female&pcx=1&svy=Count_Person_EducationalAttainmentBachelorsDegree&svpy=2-0-6&svdy=Count_Person_25OrMoreYears&svny=Bachelors_Degree&pcy=1&epd=geoId%2F06&epn=California&epts=State&ept=County"
            }
          >
            California
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Count_Person_Female&svpx=0-8-0&svdx=Count_Person&svnx=Female&pcx=1&svy=Count_Person_EducationalAttainmentBachelorsDegree&svpy=2-0-6&svdy=Count_Person_25OrMoreYears&svny=Bachelors_Degree&pcy=1&epd=geoId%2F36&epn=New%20York&epts=State&ept=County"
            }
          >
            New York
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Count_Person_Female&svpx=0-8-0&svdx=Count_Person&svnx=Female&pcx=1&svy=Count_Person_EducationalAttainmentBachelorsDegree&svpy=2-0-6&svdy=Count_Person_25OrMoreYears&svny=Bachelors_Degree&pcy=1&epd=geoId%2F56&epn=Wyoming&epts=State&ept=County"
            }
          >
            Wyoming
          </a>
        </li>
        <li>
          <b>Covid-19 Cases vs African American Per Capita</b> for{" "}
          <a
            href={
              "#&svx=Count_Person_BlackOrAfricanAmericanAlone&svpx=0-14-2&svdx=Count_Person&svnx=Black_Or_African_American_Alone&pcx=1&svy=CumulativeCount_MedicalConditionIncident_COVID_19_ConfirmedOrProbableCase&svpy=5-2-0-1&svdy=Count_Person&svny=Positive&pcy=1&epd=country/USA&epn=United%20States%20of%20America&epts=Country&ept=State"
            }
          >
            US states
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Count_Person_BlackOrAfricanAmericanAlone&svpx=0-14-2&svdx=Count_Person&svnx=Black_Or_African_American_Alone&pcx=1&svy=CumulativeCount_MedicalConditionIncident_COVID_19_ConfirmedOrProbableCase&svpy=5-2-0-1&svdy=Count_Person&svny=Positive&pcy=1&epd=country/USA&epn=United%20States%20of%20America&epts=Country&ept=County"
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
