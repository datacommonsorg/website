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
          <b>Asians Per Capita vs Median Income</b> for counties in
          <a
            href={
              "#%26svx%3DMedian_Income_Person%26svpx%3D0-3%26svnx%3DMedian%20income%26svy%3DCount_Person_AsianAlone%26svpy%3D0-14-1%26svdy%3DCount_Person%26svny%3DAsian%20Alone%26pcy%3D1%26epd%3DgeoId%2F06%26epn%3DCalifornia%26ept%3DCounty"
            }
          >
            {" "}
            California
          </a>
          ,
          <a
            href={
              "#%26svx%3DMedian_Income_Person%26svpx%3D0-3%26svnx%3DMedian%20income%26svy%3DCount_Person_AsianAlone%26svpy%3D0-14-1%26svdy%3DCount_Person%26svny%3DAsian%20Alone%26pcy%3D1%26epd%3DgeoId%2F48%26epn%3DTexas%26ept%3DCounty"
            }
          >
            {" "}
            Texas
          </a>
          ,
          <a
            href={
              "#%26svx%3DMedian_Income_Person%26svpx%3D0-3%26svnx%3DMedian%20income%26svy%3DCount_Person_AsianAlone%26svpy%3D0-14-1%26svdy%3DCount_Person%26svny%3DAsian%20Alone%26pcy%3D1%26epd%3DgeoId%2F17%26epn%3DIllinois%26ept%3DCounty"
            }
          >
            {" "}
            Illinois
          </a>
          ,
          <a
            href={
              "#%26svx%3DMedian_Income_Person%26svpx%3D0-3%26svnx%3DMedian%20income%26svy%3DCount_Person_AsianAlone%26svpy%3D0-14-1%26svdy%3DCount_Person%26svny%3DAsian%20Alone%26pcy%3D1%26epd%3Dcountry%2FUSA%26epn%3DUnited%20States%20of%20America%26ept%3DCounty"
            }
          >
            {" "}
            USA
          </a>
        </li>
        <li>
          <b>Bachelor Degree Attained vs Females Per Capita</b> for counties in
          <a
            href={
              "#%26svx%3DCount_Person_Female%26svpx%3D0-8-0%26svdx%3DCount_Person%26svnx%3DFemale%26pcx%3D1%26svy%3DCount_Person_EducationalAttainmentBachelorsDegree%26svpy%3D2-0-6%26svdy%3DCount_Person_25OrMoreYears%26svny%3DBachelors%20Degree%26pcy%3D1%26epd%3DgeoId%2F06%26epn%3DCalifornia%26ept%3DCounty"
            }
          >
            {" "}
            California
          </a>
          ,
          <a
            href={
              "#%26svx%3DCount_Person_Female%26svpx%3D0-8-0%26svdx%3DCount_Person%26svnx%3DFemale%26pcx%3D1%26svy%3DCount_Person_EducationalAttainmentBachelorsDegree%26svpy%3D2-0-6%26svdy%3DCount_Person_25OrMoreYears%26svny%3DBachelors%20Degree%26pcy%3D1%26epd%3DgeoId%2F36%26epn%3DNew%20York%26ept%3DCounty"
            }
          >
            {" "}
            New York
          </a>
          ,
          <a
            href={
              "#%26svx%3DCount_Person_Female%26svpx%3D0-8-0%26svdx%3DCount_Person%26svnx%3DFemale%26pcx%3D1%26svy%3DCount_Person_EducationalAttainmentBachelorsDegree%26svpy%3D2-0-6%26svdy%3DCount_Person_25OrMoreYears%26svny%3DBachelors%20Degree%26pcy%3D1%26epd%3DgeoId%2F56%26epn%3DWyoming%26ept%3DCounty"
            }
          >
            {" "}
            Wyoming
          </a>
        </li>
        <li>
          <b>Foreign Born vs Unemployment Rate</b> for
          <a
            href={
              "#%26svx%3DUnemploymentRate_Person%26svpx%3D3-3%26svnx%3DUnemployment%20Rate%26svy%3DCount_Person_ForeignBorn%26svpy%3D0-12-2%26svdy%3DCount_Person%26svny%3DForeign%20Born%26pcy%3D1%26epd%3Dcountry%2FUSA%26epn%3DUnited%20States%20of%20America%26ept%3DState"
            }
          >
            {" "}
            US states
          </a>
          ,
          <a
            href={
              "#%26svx%3DUnemploymentRate_Person%26svpx%3D3-3%26svnx%3DUnemployment%20Rate%26svy%3DCount_Person_ForeignBorn%26svpy%3D0-12-2%26svdy%3DCount_Person%26svny%3DForeign%20Born%26pcy%3D1%26epd%3Dcountry%2FUSA%26epn%3DUnited%20States%20of%20America%26ept%3DCounty"
            }
          >
            {" "}
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
