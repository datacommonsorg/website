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
         The map explorer helps you visualize how a statistical variable from the
         pane to the left can vary across geographic regions.
       </p>
       <ol>
         <li>
           Enter a place in the search box and then select the type of places you
           want to plot in the dropdown menu above.
         </li>
         <li>
           Pick a statistical variable in the left pane. There are thousands of
           statistical variables to choose from, arranged in a topical hierarchy.
         </li>
       </ol>
       <p>Or you can start your exploration from these interesting points ...</p>
       <ul>
         <li>
           <b>Max Temperature Relative To 2006, RCP 4.5</b>
           {" for "}
           <a
             href={
               "#%26sv%3DDifferenceRelativeToBaseDate2006_Max_Temperature_RCP45%26pc%3D0%26pd%3Dcountry%2FIND%26ept%3DAdministrativeArea2"
             }
           >
             districts in India
           </a>
         </li>
         <li>
           <b>Female</b>{" "}
           <a
             href={
               "#%26sv%3DCount_Person_Literate_Female%26pc%3D0%26denom%3DCount_Person%26pd%3Dcountry%2FIND%26ept%3DAdministrativeArea2"
             }
           >
             Literate Population
           </a>
           {" and "}
           <a
             href={
               "#%26sv%3DCount_Person_Illiterate_Female%26pc%3D0%26denom%3DCount_Person%26pd%3Dcountry%2FIND%26ept%3DAdministrativeArea2"
             }
           >
             Illiterate Population
           </a>{" "}
           across districts in India
         </li>
         <li>
           <b>Mean Monthly Wages</b> across{" "}
           <a
             href={
               "#%26sv%3DMean_WagesMonthly_Worker%26pc%3D0%26denom%3DCount_Person%26pd%3Dcountry%2FIND%26ept%3DAdministrativeArea1"
             }
           >
             states in India
           </a>
         </li>
         <li>
           <b>Agricultural Laborers Population</b> across{" "}
           <a
             href={
               "#%26sv%3DCount_Person_MainWorker_AgriculturalLabourers%26pc%3D0%26denom%3DCount_Person%26pd%3Dcountry%2FIND%26ept%3DAdministrativeArea2"
             }
           >
             districts in India
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