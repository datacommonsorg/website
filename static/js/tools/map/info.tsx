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

import React from "react";

export function Info(): JSX.Element {
  // TODO(chejennifer): add examples
  return (
    <div id="placeholder-container">
      <p>
        The map explorer helps you visualize how a variable from the pane to the
        left can vary across geographic regions.
      </p>
      <ol>
        <li>
          Enter a place in the search box and then select the type of places you
          want to plot in the dropdown menu above.
        </li>
        <li>
          Pick a variable in the left pane. There are thousands of variables to
          choose from, arranged in a topical hierarchy.
        </li>
      </ol>
      <p>Or you can start your exploration from these interesting points ...</p>
      <ul>
        <li>
          <b>Median Age</b> across counties in{" "}
          <a
            href={
              "#&sv=Median_Age_Person&pc=0&pd=country/USA&pn=United%20States%20of%20America&pt=Country&ept=County"
            }
          >
            USA
          </a>
          ,{" "}
          <a
            href={
              "#&sv=Median_Age_Person&pc=0&pd=geoId/06&pn=California&pt=State&ept=County"
            }
          >
            California
          </a>
          ,{" "}
          <a
            href={
              "#&sv=Median_Age_Person&pc=0&pd=geoId/12&pn=Florida&pt=State&ept=County"
            }
          >
            Florida
          </a>
          ,{" "}
          <a
            href={
              "#&sv=Median_Age_Person&pc=0&pd=geoId/36&pn=New%20York&pt=State&ept=County"
            }
          >
            New York
          </a>
        </li>
        <li>
          <b>Median Income</b> across counties in{" "}
          <a
            href={
              "#&sv=Median_Income_Person&pc=0&pd=country/USA&pn=United%20States&pt=Country&ept=County"
            }
          >
            USA
          </a>
          ,{" "}
          <a
            href={
              "#&sv=Median_Income_Person&pc=0&pd=geoId/36&pn=New%20York&pt=State&ept=County"
            }
          >
            New York
          </a>
          ,{" "}
          <a
            href={
              "#&sv=Median_Income_Person&pc=0&pd=geoId/48&pn=Texas&pt=State&ept=County"
            }
          >
            Texas
          </a>
          ,{" "}
          <a
            href={
              "#&sv=Median_Income_Person&pc=0&pd=geoId/53&pn=Washington&pt=State&ept=County"
            }
          >
            Washington
          </a>
        </li>
        <li>
          <b>Attainment of Bachelor Degree or Higher</b> across counties in{" "}
          <a
            href={
              "#&sv=Count_Person_EducationalAttainmentBachelorsDegreeOrHigher&pc=1&pd=country/USA&pn=United%20States%20of%20America&pt=Country&ept=County"
            }
          >
            USA
          </a>
          ,{" "}
          <a
            href={
              "#&sv=Count_Person_EducationalAttainmentBachelorsDegreeOrHigher&pc=1&pd=geoId/53&pn=Washington&pt=State&ept=County"
            }
          >
            Washington
          </a>
          ,{" "}
          <a
            href={
              "#&sv=Count_Person_EducationalAttainmentBachelorsDegreeOrHigher&pc=1&pd=geoId/17&pn=Illinois&pt=State&ept=County"
            }
          >
            Illinois
          </a>
          ,{" "}
          <a
            href={
              "#&sv=Count_Person_EducationalAttainmentBachelorsDegreeOrHigher&pc=1&pd=geoId/08&pn=Colorado&pt=State&ept=County"
            }
          >
            Colorado
          </a>
        </li>
        <li>
          <b>Foreign Born</b> across counties in{" "}
          <a
            href={
              "#&sv=dc/q18w8j7b2vxm4&pc=1&pd=country/USA&pn=United%20States%20of%20America&pt=Country&ept=County"
            }
          >
            USA
          </a>
          ,{" "}
          <a
            href={
              "#&sv=dc/q18w8j7b2vxm4&pc=1&pd=geoId/06&pn=California&pt=State&ept=County"
            }
          >
            California
          </a>
          ,{" "}
          <a
            href={
              "#&sv=dc/q18w8j7b2vxm4&pc=1&pd=geoId/16&pn=Idaho&pt=State&ept=County"
            }
          >
            Idaho
          </a>
          ,{" "}
          <a
            href={
              "#&sv=dc/q18w8j7b2vxm4&pc=1&pd=geoId/12&pn=Florida&pt=State&ept=County"
            }
          >
            Florida
          </a>
        </li>
        <li>
          <b>Distribution across states in the US</b> for{" "}
          <a
            href={
              "#&sv=Median_Age_Person&pc=0&pd=country/USA&pn=United%20States%20of%20America&pt=Country&ept=State"
            }
          >
            Median Age
          </a>
          ,{" "}
          <a
            href={
              "#&sv=Count_Person_EducationalAttainmentNoSchoolingCompleted&pc=1&pd=country/USA&pn=United%20States%20of%20America&pt=Country&ept=State"
            }
          >
            No Schooling Completed
          </a>
          ,{" "}
          <a
            href={
              "#&sv=Median_Income_Person&pc=0&pd=country/USA&pn=United%20States%20of%20America&pt=Country&ept=State"
            }
          >
            Median Income
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
