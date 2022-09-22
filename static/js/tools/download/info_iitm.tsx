/**
 * Copyright 2022 Google LLC
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
   return (
     <div id="placeholder-container">
       <p>
         The data download tool allows you to download data for the statistical
         variables in the left pane. To get started:
       </p>
       <ol>
         <li>
           Enter a place in the search box and then select the type of places you
           want to download data for.
         </li>
         <li>
           Pick up to 5 statistical variables in the left pane. There are
           thousands of statistical variables to choose from, arranged in a
           topical hierarchy.
         </li>
         <li>
           Choose whether you want the data for the latest date, all available
           dates, or a custom date range.
         </li>
       </ol>
       <p>
         Data will be downloaded as a .csv file where each row contains the data
         for a place and date combination. For example:
       </p>
       <div className="download-info-table-example">
         <table>
           <thead>
             <tr>
               <th>placeDcid</th>
               <th>placeName</th>
               <th>Date:[Variable1]</th>
               <th>Value:[Variable1]</th>
               <th>Source:[Variable1]</th>
               <th>Date:[Variable2]</th>
               <th>Value:[Variable2]</th>
               <th>Source:[Variable2]</th>
             </tr>
           </thead>
           <tbody>
             <tr>
               <td>wikidataId/Q1445</td>
               <td>Tamil Nadu</td>
               <td>2020-01</td>
               <td>1</td>
               <td>abc.com</td>
               <td>2020</td>
               <td>11</td>
               <td>xyz.com</td>
             </tr>
             <tr>
               <td>wikidataId/Q1445</td>
               <td>Tamil Nadu</td>
               <td>2020-02</td>
               <td>1</td>
               <td>abc.com</td>
               <td></td>
               <td></td>
               <td></td>
             </tr>
             <tr>
               <td>wikidataId/Q1445</td>
               <td>Tamil Nadu</td>
               <td>2020-03</td>
               <td>1</td>
               <td>abc.com</td>
               <td></td>
               <td></td>
               <td></td>
             </tr>
             <tr>
               <td>...</td>
             </tr>
             <tr>
               <td>wikidataId/Q1445</td>
               <td>Tamil Nadu</td>
               <td>2021-01</td>
               <td>1</td>
               <td>abc.com</td>
               <td>2021</td>
               <td>11</td>
               <td>xyz.com</td>
             </tr>
             <tr>
               <td>wikidataId/Q1353</td>
               <td>Delhi</td>
               <td>2020-01</td>
               <td>2</td>
               <td>abc.com</td>
               <td>2020</td>
               <td>22</td>
               <td>xyz.com</td>
             </tr>
             <tr>
               <td>wikidataId/Q1353</td>
               <td>Delhi</td>
               <td>2020-02</td>
               <td>2</td>
               <td>abc.com</td>
               <td></td>
               <td></td>
               <td></td>
             </tr>
             <tr>
               <td>...</td>
             </tr>
           </tbody>
         </table>
       </div>
     </div>
   );
 }
 