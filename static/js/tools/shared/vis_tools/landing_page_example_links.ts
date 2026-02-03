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
import { VisToolExampleChartMessages } from "../../../i18n/i18n_tool_messages";

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
      title: intl.formatMessage(
        VisToolExampleChartMessages.waterWithdrawalRateInUsa
      ),
      url: "/tools/map#%26sv%3DWithdrawalRate_Water%26pc%3D0%26denom%3DCount_Person%26pd%3Dcountry%2FUSA%26ept%3DCounty",
    },
    {
      id: "map_unemployment_rate_in_new_jersey",
      title: intl.formatMessage(
        VisToolExampleChartMessages.unemploymentRateInNewJersey
      ),
      url: "/tools/map#%26sv%3DUnemploymentRate_Person%26pc%3D0%26denom%3DCount_Person%26pd%3DgeoId%2F34%26ept%3DCounty",
    },
    {
      id: "map_median_income_in_texas",
      title: intl.formatMessage(
        VisToolExampleChartMessages.medianIncomeInTexas
      ),
      url: "/tools/map#%26sv%3DMedian_Income_Person%26pc%3D0%26denom%3DCount_Person%26pd%3DgeoId%2F48%26ept%3DCounty",
    },
    {
      id: "map_attainment_of_bachelor_degree_in_colorado",
      title: intl.formatMessage(
        VisToolExampleChartMessages.attainmentOfBachelorDegreeInColorado
      ),
      url: "/tools/map#%26sv%3DCount_Person_EducationalAttainmentBachelorsDegreeOrHigher%26pc%3D1%26denom%3DCount_Person%26pd%3DgeoId%2F08%26ept%3DCounty",
    },
    {
      id: "map_projected_temperature_rise_in_the_usa",
      title: intl.formatMessage(
        VisToolExampleChartMessages.projectedTemperatureRiseInUsa
      ),
      url: "/tools/map#%26sv%3DDifferenceRelativeToBaseDate2006_Max_Temperature_RCP45%26pc%3D0%26denom%3DCount_Person%26pd%3Dcountry%2FUSA%26ept%3DCounty",
    },
    {
      id: "map_median_age_in_usa",
      title: intl.formatMessage(VisToolExampleChartMessages.medianAgeInUsa),
      url: "/tools/map#%26sv%3DMedian_Age_Person%26pc%3D0%26denom%3DCount_Person%26pd%3Dcountry%2FUSA%26ept%3DCounty",
    },
    {
      id: "map_no_schooling_completed_in_usa",
      title: intl.formatMessage(
        VisToolExampleChartMessages.noSchoolingCompletedInUsa
      ),
      url: "/tools/map#%26sv%3DCount_Person_EducationalAttainmentNoSchoolingCompleted%26pc%3D0%26denom%3DCount_Person%26pd%3Dcountry%2FUSA%26ept%3DCounty",
    },
  ],
  scatterLinks: [
    {
      id: "scatter_prevalence_of_coronary_heart_disease_vs_projected_temperature_rise_in_the_usa",
      title: intl.formatMessage(
        VisToolExampleChartMessages.coronaryHeartDiseaseVsProjectedTemperatureRise
      ),
      url: "/tools/scatter#%26svx%3DDifferenceRelativeToBaseDate2006_Max_Temperature_RCP45%26dx%3DCount_Person%26svy%3DPercent_Person_WithCoronaryHeartDisease%26dy%3DCount_Person%26epd%3Dcountry%2FUSA%26ept%3DCounty%26qd%3D1%26dd%3D1%26pp%3D",
    },
    {
      id: "scatter_literate_population_per_capita_vs_population_below_poverty_level_per_capita_for_states_in_india",
      title: intl.formatMessage(
        VisToolExampleChartMessages.literatePopulationVsPopulationBelowPovertyLevel
      ),
      url: "/tools/scatter#svx%3DCount_Person_BelowPovertyLevelInThePast12Months_AsFractionOf_Count_Person%26dx%3DCount_Person%26svy%3DCount_Person_Literate%26pcy%3D1%26dy%3DCount_Person%26epd%3Dcountry%2FIND%26ept%3DAdministrativeArea1",
    },
  ],
  timelineLinks: [
    {
      id: "timeline_water_withdrawal_rate_in_california",
      title: intl.formatMessage(
        VisToolExampleChartMessages.waterWithdrawalRateInCalifornia
      ),
      url: "/tools/timeline#place=geoId%2F06&statsVar=WithdrawalRate_Water_Thermoelectric__WithdrawalRate_Water_PublicSupply__WithdrawalRate_Water_Irrigation__WithdrawalRate_Water_Aquaculture",
    },
    {
      id: "timeline_university_towns_by_income",
      title: intl.formatMessage(
        VisToolExampleChartMessages.universityTownsByIncome
      ),
      url: "/tools/timeline#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Median_Income_Person",
    },
    {
      id: "timeline_close_but_different_berkeley_and_piedmont",
      title: intl.formatMessage(
        VisToolExampleChartMessages.closeButDifferentBerkeleyAndPiedmont
      ),
      url: "/tools/timeline#place=geoId%2F0606000%2CgeoId%2F0656938&statsVar=Median_Income_Person__Percent_Person_18OrMoreYears_WithPoorGeneralHealth__Monthly_Median_GrossRent_HousingUnit__Count_CriminalActivities_CombinedCrime&chart=%7B%22count-none%22%3A%7B%22pc%22%3Afalse%2C%22delta%22%3Afalse%7D%2C%22age-none%22%3A%7B%22pc%22%3Afalse%2C%22delta%22%3Afalse%7D%2C%22grossRent-none%22%3A%7B%22pc%22%3Afalse%2C%22delta%22%3Afalse%7D%2C%22unemploymentRate-none%22%3A%7B%22pc%22%3Afalse%2C%22delta%22%3Afalse%7D%7D",
    },
    {
      id: "timeline_close_but_different_palo_alto_and_east_palo_alto",
      title: intl.formatMessage(
        VisToolExampleChartMessages.closeButDifferentPaloAltoAndEastPaloAlto
      ),
      url: "/tools/timeline#place=geoId%2F0655282%2CgeoId%2F0620956&statsVar=Median_Income_Person__UnemploymentRate_Person__Count_Person_HispanicOrLatino__Count_Person_AsianAlone__Count_Person_BlackOrAfricanAmericanAlone__Count_Person_WhiteAlone__Percent_Person_18OrMoreYears_WithPoorGeneralHealth__Monthly_Median_GrossRent_HousingUnit&chart=%7B%22count-none%22%3A%7B%22pc%22%3Afalse%2C%22delta%22%3Afalse%7D%2C%22age-none%22%3A%7B%22pc%22%3Afalse%2C%22delta%22%3Afalse%7D%2C%22grossRent-none%22%3A%7B%22pc%22%3Afalse%2C%22delta%22%3Afalse%7D%7D",
    },
  ],
};
