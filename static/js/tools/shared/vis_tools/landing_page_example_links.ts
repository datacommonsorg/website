/**
 * Copyright 2025 Google LLC
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

/** Config of links to example charts to display on the landing pages of
 *  the map, scatter, and timeline tools.
 */

export const landingPageLinks = {
  mapLinks: [
    {
      text: "Water withdrawal rate in the USA",
      url: "/tools/map#%26sv%3DWithdrawalRate_Water%26pc%3D0%26denom%3DCount_Person%26pd%3Dcountry%2FUSA%26ept%3DCounty",
    },
    {
      text: "Unemployment rate in New Jersey",
      url: "/tools/map#%26sv%3DUnemploymentRate_Person%26pc%3D0%26denom%3DCount_Person%26pd%3DgeoId%2F34%26ept%3DCounty",
    },
    {
      text: "Median Income in Texas",
      url: "/tools/map#%26sv%3DMedian_Income_Person%26pc%3D0%26denom%3DCount_Person%26pd%3DgeoId%2F48%26ept%3DCounty",
    },
    {
      text: "Attainment of bachelor's degree in Colorado",
      url: "/tools/map#%26sv%3DCount_Person_EducationalAttainmentBachelorsDegreeOrHigher%26pc%3D1%26denom%3DCount_Person%26pd%3DgeoId%2F08%26ept%3DCounty",
    },
  ],
  scatterLinks: [
    {
      text: "Prevalence of coronary heart disease vs. projected temperature rise in the USA",
      url: "/tools/scatter#%26svx%3DDifferenceRelativeToBaseDate2006_Max_Temperature_RCP45%26dx%3DCount_Person%26svy%3DPercent_Person_WithCoronaryHeartDisease%26dy%3DCount_Person%26epd%3Dcountry%2FUSA%26ept%3DCounty%26qd%3D1%26dd%3D1%26pp%3D",
    },
    {
      text: "Literate population per capita vs. population below poverty level per capita for states in India",
      url: "/tools/scatter#%26svx%3DCount_Person_BelowPovertyLevelInThePast12Months_AsFractionOf_Count_Person%26pcx%3D1%26dx%3DCount_Person%26svy%3DCount_Person_Literate%26pcy%3D1%26dy%3DCount_Person%26epd%3Dcountry%2FIND%26ept%3DAdministrativeArea1%26ct%3D1%26pp%3D",
    },
  ],
  timelineLinks: [
    {
      text: "Water withdrawal rate in California",
      url: "/tools/timeline#place=geoId%2F06&statsVar=WithdrawalRate_Water_Thermoelectric__WithdrawalRate_Water_PublicSupply__WithdrawalRate_Water_Irrigation__WithdrawalRate_Water_Aquaculture",
    },
    {
      text: "University towns by income",
      url: "/tools/timeline#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Median_Income_Person",
    },
    {
      text: "Berkeley & Piedmont poverty",
      url: '/tools/timeline#place=geoId%2F0606000%2CgeoId%2F0656938&statsVar=Count_Person_BelowPovertyLevelInThePast12Months&chart=%7B"count"%3A%7B"pc"%3Atrue%2C"denom"%3A"Count_Person"%7D%7D',
    },
  ],
};
