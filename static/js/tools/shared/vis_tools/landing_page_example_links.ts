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

import { Link } from "../../../components/elements/link_chip";
import { intl } from "../../../i18n/i18n";

/** Config of links to example charts to display on the landing pages of
 *  the map, scatter, and timeline tools.
 */

interface LandingPageLinkConfig {
  mapLinks: Link[];
  scatterLinks: Link[];
  timelineLinks: Link[];
}

export const landingPageLinks: LandingPageLinkConfig = {
  mapLinks: [
    {
      id: "map_water_withdrawal_rate_in_the_usa",
      title: intl.formatMessage({
        id: "water_withdrawal_rate_in_the_usa",
        defaultMessage: "Water withdrawal rate in the USA",
        description:
          "Title of a map plotting the statistical variable 'water withdrawal rates' in US states.",
      }),
      url: "/tools/map#%26sv%3DWithdrawalRate_Water%26pc%3D0%26denom%3DCount_Person%26pd%3Dcountry%2FUSA%26ept%3DCounty",
    },
    {
      id: "map_unemployment_rate_in_new_jersey",
      title: intl.formatMessage({
        id: "unemployment_rate_in_new_jersey",
        defaultMessage: "Unemployment rate in New Jersey",
        description:
          "Title of a map plotting the statistical variable 'unemployment rate' in counties of New Jersey",
      }),
      url: "/tools/map#%26sv%3DUnemploymentRate_Person%26pc%3D0%26denom%3DCount_Person%26pd%3DgeoId%2F34%26ept%3DCounty",
    },
    {
      id: "map_median_income_in_texas",
      title: intl.formatMessage({
        id: "median_income_in_texas",
        defaultMessage: "Median Income in Texas",
        description:
          "Title of a map plotting the statistical variable 'median income' in counties of Texas",
      }),
      url: "/tools/map#%26sv%3DMedian_Income_Person%26pc%3D0%26denom%3DCount_Person%26pd%3DgeoId%2F48%26ept%3DCounty",
    },
    {
      id: "map_attainment_of_bachelor_degree_in_colorado",
      title: intl.formatMessage({
        id: "attainment_of_bachelor_degree_in_colorado",
        defaultMessage: "Attainment of bachelor's degree in Colorado",
        description:
          "Title of a map plotting the statistical variable 'bachelors degree attainment' for counties of Colorado",
      }),
      url: "/tools/map#%26sv%3DCount_Person_EducationalAttainmentBachelorsDegreeOrHigher%26pc%3D1%26denom%3DCount_Person%26pd%3DgeoId%2F08%26ept%3DCounty",
    },
  ],
  scatterLinks: [
    {
      id: "scatter_prevalence_of_coronary_heart_disease_vs_projected_temperature_rise_in_the_usa",
      title: intl.formatMessage({
        id: "prevalence_of_coronary_heart_disease_vs_projected_temperature_rise_in_the_usa",
        defaultMessage:
          "Prevalence of coronary heart disease vs. projected temperature rise in the USA",
        description:
          "Title of a scatter plot showing the correlation between coronary heart disease and projected temperature rise in the USA",
      }),
      url: "/tools/scatter#%26svx%3DDifferenceRelativeToBaseDate2006_Max_Temperature_RCP45%26dx%3DCount_Person%26svy%3DPercent_Person_WithCoronaryHeartDisease%26dy%3DCount_Person%26epd%3Dcountry%2FUSA%26ept%3DCounty%26qd%3D1%26dd%3D1%26pp%3D",
    },
    {
      id: "scatter_literate_population_per_capita_vs_population_below_poverty_level_per_capita_for_states_in_india",
      title: intl.formatMessage({
        id: "literate_population_per_capita_vs_population_below_poverty_level_per_capita_for_states_in_india",
        defaultMessage:
          "Literate population per capita vs. population below poverty level per capita for states in India",
        description:
          "Title of a scatter plot showing the correlation between the literate population per capita and population below poverty level per capita for states in India",
      }),
      url: "/tools/scatter#%26svx%3DCount_Person_BelowPovertyLevelInThePast12Months_AsFractionOf_Count_Person%26pcx%3D1%26dx%3DCount_Person%26svy%3DCount_Person_Literate%26pcy%3D1%26dy%3DCount_Person%26epd%3Dcountry%2FIND%26ept%3DAdministrativeArea1%26ct%3D1%26pp%3D",
    },
  ],
  timelineLinks: [
    {
      id: "timeline_water_withdrawal_rate_in_california",
      title: intl.formatMessage({
        id: "water_withdrawal_rate_in_california",
        defaultMessage: "Water withdrawal rate in California",
        description:
          "Title of a line chart plotting the statistical variable 'water withdrawal rate' in California",
      }),
      url: "/tools/timeline#place=geoId%2F06&statsVar=WithdrawalRate_Water_Thermoelectric__WithdrawalRate_Water_PublicSupply__WithdrawalRate_Water_Irrigation__WithdrawalRate_Water_Aquaculture",
    },
    {
      id: "timeline_university_towns_by_income",
      title: intl.formatMessage({
        id: "university_towns_by_income",
        defaultMessage: "University towns by income",
        description:
          "Title of a line chart plotting the statistical variable 'income' in a set of towns known for having a university",
      }),
      url: "/tools/timeline#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Median_Income_Person",
    },
    {
      id: "timeline_berkeley_and_piedmont_poverty",
      title: intl.formatMessage({
        id: "berkeley_and_piedmont_poverty",
        defaultMessage: "Berkeley & Piedmont poverty",
        description:
          "Title of a line chart plotting the statistical variable 'poverty' for both Berkeley, USA and Piedmont, USA",
      }),
      url: '/tools/timeline#place=geoId%2F0606000%2CgeoId%2F0656938&statsVar=Count_Person_BelowPovertyLevelInThePast12Months&chart=%7B"count"%3A%7B"pc"%3Atrue%2C"denom"%3A"Count_Person"%7D%7D',
    },
  ],
};
