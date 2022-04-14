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
          <b>Literacy Rate vs Poverty Rate</b> among{" "}
          <a
            href={
              "#%26svx%3DCount_Person_Literate%26dx%3DCount_Person%26svy%3DCount_Person_BelowPovertyLevelInThePast12Months%26dy%3DCount_Person%26epd%3Dcountry%2FIND%26ept%3DAdministrativeArea1"
            }
          >
            all Indian states
          </a>
        </li>
        <li>
          <b>Count of Urban Households vs Rural Households</b> among{" "}
          <a
            href={
              "#%26svx%3DCount_Household_Urban%26dx%3DCount_Person%26svy%3DCount_Household_Rural%26dy%3DCount_Person%26epd%3Dcountry%2FIND%26ept%3DAdministrativeArea2"
            }
          >
            all Indian districts
          </a>
        </li>
        <li>
          <b>Literate Population Per Capita vs Count Of Schools Per Capita</b>{" "}
          for{" "}
          <a
            href={
              "#&svx=Count_School&pcx=1&dx=Count_Person&svy=Count_Person_Literate&pcy=1&dy=Count_Person&epd=country/IND&ept=AdministrativeArea1&ct=1"
            }
          >
            states in India
          </a>
        </li>
        <li>
          <b>Worker Population vs Female Literate Population</b> among{" "}
          <a
            href={
              "#%26svx%3DCount_Person_Literate_Female%26dx%3DCount_Person%26svy%3DCount_Person_Workers%26dy%3DCount_Person%26epd%3Dcountry%2FIND%26ept%3DAdministrativeArea1"
            }
          >
            all states in India
          </a>
        </li>
        <li>
          <b>Number of Schools vs Dropout Rate of Female Students</b> among{" "}
          <a
            href={
              "#%26svx%3DDropoutRate_Student_Female_PrimarySchool%26dx%3DCount_Person%26svy%3DCount_School%26dy%3DCount_Person%26epd%3Dcountry%2FIND%26ept%3DAdministrativeArea1"
            }
          >
            all states in India
          </a>
        </li>
      </ul>
      <p>Take the data and use it on your site!</p>
      <p>
        <a href="mailto:datacommons@rbcdsai.org">Send</a> us your discoveries!
      </p>
    </div>
  );
}

export { Info };
