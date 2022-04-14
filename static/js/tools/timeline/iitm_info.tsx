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
           state, district, country --- in the search box above and then pick
           one or more statistical variables in the pane. There are thousands of
           statistical variables to choose from, arranged in a topical hierarchy.
         </p>
         <p>
           Or you can start your exploration from these interesting points ...
         </p>
         <ul>
            <li>
                <b>Comparison of Indian states</b>
                <br />
                <span>
                    <a
                    href={
                        "#place=wikidataId%2FQ1185%2CwikidataId%2FQ1191%2CwikidataId%2FQ1159%2CwikidataId%2FQ1445%2CwikidataId%2FQ677037%2CwikidataId%2FQ1186&statsVar=UnemploymentRate_Person_Urban"
                    }
                    >
                    {" "}
                    Unemployment Rates Comparison
                    </a>
                    {" "}
                     among Indian states
                </span>
                <br />
                <span>
                    <a
                    href={
                        "#place=wikidataId%2FQ1185%2CwikidataId%2FQ1159%2CwikidataId%2FQ1445%2CwikidataId%2FQ1191%2CwikidataId%2FQ677037&statsVar=Count_Person_BelowPovertyLevelInThePast12Months"
                    }
                    >
                    {" "}
                    Decline in Poverty Level
                    </a>
                    {" "}
                     among Indian states
                </span>
                <br />
                <span>
                    <a
                    href={
                        "#&place=wikidataId/Q1185,wikidataId/Q1191,wikidataId/Q1159,wikidataId/Q1445,wikidataId/Q677037,wikidataId/Q1186&statsVar=Mean_WagesMonthly_Worker"
                    }
                    >
                    {" "}
                    Mean monthly wages
                    </a>
                    {" "}
                     - a state-level comparison
                </span>
           </li>
           <li>
             <b>How India fares compared to other countries</b>
             <br />
             <span>
               <a
                 href={
                   "#statsVar=CumulativeCount_Vaccine_COVID_19_Administered&place=country%2FIND%2Ccountry%2FGBR%2Ccountry%2FDEU%2Ccountry%2FUSA"
                 }
               >
                 {" "}
                 COVID-19 Vaccines Administered
               </a>
             </span>
             <br />
             <span>
               <a
                 href={
                   "#place=country%2FIND%2Ccountry%2FUSA%2Ccountry%2FCHN%2Ccountry%2FGBR&statsVar=Amount_Emissions_CarbonDioxide_PerCapita"
                 }
               >
                 {" "}
                 Per-Capita CO2 Emissions
               </a>
             </span>
             <br />
             <span>
               <a
                 href={
                   "#place=country%2FIND%2Ccountry%2FIDN%2Ccountry%2FBGD%2Ccountry%2FKEN%2Ccountry%2FJPN%2Ccountry%2FUSA&statsVar=Count_Person_IsInternetUser_PerCapita"
                 }
               >
                 {" "}
                 Percentage of Internet Users
               </a>
             </span>
             <br />
             <span>
               <a
                 href={
                   "#place=country%2FIND%2Ccountry%2FJPN%2Ccountry%2FFRA%2Ccountry%2FDEU%2Ccountry%2FCHN%2Ccountry%2FUSA&statsVar=Amount_Production_ElectricityFromNuclearSources_AsFractionOf_Amount_Production_Energy"
                 }
               >
                 {" "}
                 Fraction of Electricity Generated Through Nuclear Energy
               </a>
             </span>
             <br />
             <span>
               <a
                 href={
                   "#statsVar=Annual_Consumption_Energy_OilRefineries_Refinery_FuelTransformation&place=country%2FIND%2Ccountry%2FCHN%2Ccountry%2FGBR%2Ccountry%2FUSA"
                 }
               >
                 {" "}
                 Annual Consumption of Energy Per-Capita
               </a>
             </span>
           </li>
           <li>
            <a
                href={
                "#statsVar=Count_CycloneEvent&place=country%2FIND%2Ccountry%2FBGD%2Ccountry%2FPHL%2Ccountry%2FJPN"
                }
                >
                {" "}
                Cyclone Events
            </a>
            {" "}
            in Asian countries
           </li>
         </ul>
         <p>Take the data and use it on your site!</p>
         <p>
           <a href="mailto:datacommons@rbcdsai.org">Send</a> us your
           discoveries!
         </p>
       </div>
     );
   }
 }
 
 export { Info }; 