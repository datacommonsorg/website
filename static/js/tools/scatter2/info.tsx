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
        variables that appear in the pane to the left.
      </p>
      <ol>
        <li>
          Enter a place in the search box and then select the type of places you
          want to plot in the dropdown menu above.
        </li>
        <li>
          Pick two variables in the left pane. There are thousands of variables
          to choose from, arranged in a topical hierarchy.
        </li>
      </ol>
      <p>Or you can start your exploration from these interesting points ...</p>
      <ul>
        <li>
          <b>Asians Per Capita vs Median Income</b> for counties in{" "}
          <a
            href={
              "#&svx=Median_Income_Person&svpx=0-3&svnx=Median_income&svy=Count_Person_AsianAlone&svpy=0-14-1&svdy=Count_Person&svny=Asian_Alone&pcy=1&epd=geoId%2F06&epn=California&ept=County"
            }
          >
            California
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Median_Income_Person&svpx=0-3&svnx=Median_income&svy=Count_Person_AsianAlone&svpy=0-14-1&svdy=Count_Person&svny=Asian_Alone&pcy=1&epd=geoId%2F48&epn=Texas&ept=County"
            }
          >
            Texas
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Median_Income_Person&svpx=0-3&svnx=Median_income&svy=Count_Person_AsianAlone&svpy=0-14-1&svdy=Count_Person&svny=Asian_Alone&pcy=1&epd=geoId%2F17&epn=Illinois&ept=County"
            }
          >
            Illinois
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Median_Income_Person&svpx=0-3&svnx=Median_income&svy=Count_Person_AsianAlone&svpy=0-14-1&svdy=Count_Person&svny=Asian_Alone&pcy=1&epd=country%2FUSA&epn=United_States_of_America&ept=County"
            }
          >
            USA
          </a>
        </li>
        <li>
          <b>Bachelor Degree Attained vs Females Per Capita</b> for counties in{" "}
          <a
            href={
              "#&svx=Count_Person_Female&svpx=0-8-0&svdx=Count_Person&svnx=Female&pcx=1&svy=Count_Person_EducationalAttainmentBachelorsDegree&svpy=2-0-6&svdy=Count_Person_25OrMoreYears&svny=Bachelors_Degree&pcy=1&epd=geoId%2F06&epn=California&ept=County"
            }
          >
            California
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Count_Person_Female&svpx=0-8-0&svdx=Count_Person&svnx=Female&pcx=1&svy=Count_Person_EducationalAttainmentBachelorsDegree&svpy=2-0-6&svdy=Count_Person_25OrMoreYears&svny=Bachelors_Degree&pcy=1&epd=geoId%2F36&epn=New_York&ept=County"
            }
          >
            New York
          </a>
          ,{" "}
          <a
            href={
              "#&svx=Count_Person_Female&svpx=0-8-0&svdx=Count_Person&svnx=Female&pcx=1&svy=Count_Person_EducationalAttainmentBachelorsDegree&svpy=2-0-6&svdy=Count_Person_25OrMoreYears&svny=Bachelors_Degree&pcy=1&epd=geoId%2F56&epn=Wyoming&ept=County"
            }
          >
            Wyoming
          </a>
        </li>
        <li>
          <b>Foreign Born vs Unemployment Rate</b> for{" "}
          <a
            href={
              "#&svx=UnemploymentRate_Person&svpx=3-3&svnx=Unemployment_Rate&svy=Count_Person_ForeignBorn&svpy=0-12-2&svdy=Count_Person&svny=Foreign_Born&pcy=1&epd=country%2FUSA&epn=United_States_of_America&ept=State"
            }
          >
            US states
          </a>
          ,{" "}
          <a
            href={
              "#&svx=UnemploymentRate_Person&svpx=3-3&svnx=Unemployment_Rate&svy=Count_Person_ForeignBorn&svpy=0-12-2&svdy=Count_Person&svny=Foreign_Born&pcy=1&epd=country%2FUSA&epn=United_States_of_America&ept=County"
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
