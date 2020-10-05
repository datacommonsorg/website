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
 * Titles for each stats var. Used as titles in Ranking pages to describe each
 * stats var.
 */
const STATS_VAR_TITLES: { [key: string]: string } = {
  // No PVs
  Median_Age_Person: "Median Age",
  Median_Income_Person: "Median Individual Income",
  UnemploymentRate_Person: "Unemployment Rate",
  Count_UnemploymentInsuranceClaim_StateUnemploymentInsurance:
    "State Unemployment Insurance Claims",
  Count_Person_Employed: "Count of Employed People",
  Count_Person_InLaborForce: "Count of People in Labor Force",
  Count_Person: "Population",
  Count_Person_PerArea: "Person Per Area",
  LifeExpectancy_Person: "Life Expectancy",
  GrowthRate_Count_Person: "Population Growth Rate",
  FertilityRate_Person_Female: "Fertility Rate",

  // Economics
  Amount_EconomicActivity_GrossDomesticProduction_Nominal:
    "Gross Domestic Product (Nominal)",
  GrowthRate_Amount_EconomicActivity_GrossDomesticProduction:
    "Gross Domestic Product Growth Rate",
  Amount_Debt_Government: "Government Debt",
  Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita:
    "Gross Domestic Product (Nominal) Per Capita",
  Amount_EconomicActivity_GrossNationalIncome_PurchasingPowerParity_PerCapita:
    "Gross National Income (Purchasing Power Parity) Per Capita",
  Amount_EconomicActivity_GrossNationalIncome_PurchasingPowerParity:
    "Gross National Income (Purchasing Power Parity)",
  "WorldBank/SL_TLF_0714_ZS": "Children Ages 7-14 in Employment",
  "WorldBank/SE_XPD_TOTL_GB_ZS":
    "Government Expenditures on Education (% of Government Expenditures)",
  "WorldBank/SE_XPD_TOTL_GD_ZS":
    "Government Expenditures on Education (% of GDP)",
  "WorldBank/MS_MIL_XPND_CD": "Government Expenditures on Military",
  "WorldBank/MS_MIL_XPND_GD_ZS":
    "Government Expenditures on Military (% of GDP)",
  "WorldBank/CM_MKT_LCAP_CD": "Market Capitalization of Domestic Companies",
  "WorldBank/CM_MKT_LCAP_GD_ZS":
    "Market Capitalization of Domestic Companies (% of GDP)",
  "WorldBank/BX_TRF_PWKR_CD_DT": "Inward Remittance",
  "WorldBank/BX_TRF_PWKR_DT_GD_ZS": "Inward Remittance (% of GDP)",
  "WorldBank/BM_TRF_PWKR_CD_DT": "Outward Remittance",

  // Environment
  Amount_Consumption_Energy_PerCapita: "Energy Consumption Per Capita",
  Amount_Emissions_CarbonDioxide_PerCapita:
    "Carbon Dioxide Emissions Per Capita",
  Amount_Consumption_Electricity_PerCapita:
    "Electricity Consumption Per Capita",
  Count_EarthquakeEvent: "Earthquake Events",
  Count_CycloneEvent: "Cyclone Events",
  Count_StormSurgeTideEvent: "Storm Surge Tide Events",
  Count_WildlandFireEvent: "Wildland Fire Events",
  Count_TornadoEvent: "Tornado Events",
  Count_ThunderstormWindEvent: "Thunderstorm Events",
  Count_FloodEvent: "Flood Events",
  Count_DroughtEvent: "Drought Events",

  // age
  Count_Person_Upto5Years: "Population Ages 0-5",
  Count_Person_5To17Years: "Population Ages 5-17",
  Count_Person_15To19Years: "Population Ages 15-19",
  Count_Person_20To24Years: "Population Ages 20-24",
  Count_Person_25To29Years: "Population Ages 25-29",
  Count_Person_25To34Years: "Population Ages 25-34",
  Count_Person_30To34Years: "Population Ages 30-34",
  Count_Person_35To39Years: "Population Ages 35-39",
  Count_Person_35To44Years: "Population Ages 35-44",
  Count_Person_40To44Years: "Population Ages 40-44",
  Count_Person_45To49Years: "Population Ages 45-49",
  Count_Person_45To54Years: "Population Ages 45-54",
  Count_Person_50To54Years: "Population Ages 50-54",
  Count_Person_55To59Years: "Population Ages 55-59",
  Count_Person_60To64Years: "Population Ages 60-64",
  Count_Person_65To69Years: "Population Ages 65-69",
  Count_Person_65OrMoreYears: "Population Ages 65+",
  Count_Person_70To74Years: "Population Ages 70-74",
  Count_Person_75To79Years: "Population Ages 75-79",
  Count_Person_80To84Years: "Population Ages 80-84",
  Count_Person_85To89Years: "Population Ages 85-89",

  // gender
  Count_Person_Male: "Population (Male)",
  Count_Person_Female: "Population (Female)",
  Median_Age_Person_Male: "Median Age of Males",
  Median_Age_Person_Female: "Median Age of Females",

  // race
  Count_Person_AmericanIndianOrAlaskaNativeAlone:
    "Population (American Indians or Alaska Native)",
  Count_Person_AsianAlone: "Population (Asian Alone)",
  Count_Person_BlackOrAfricanAmericanAlone:
    "Population (Black or African American)",
  Count_Person_HispanicOrLatino: "Population (Hispanic or Latino)",
  Count_Person_NativeHawaiianAndOtherPacificIslanderAlone:
    "Population (Native Hawaiian and Pacific Islander)",
  Count_Person_SomeOtherRaceAlone: "Population (Some other race)",
  Count_Person_TwoOrMoreRaces: "Population (Two or More Races)",
  Count_Person_WhiteAlone: "Population (White Alone)",

  Median_Age_Person_AmericanIndianOrAlaskaNativeAlone:
    "Median Age (American Indian or Alaska Native)",
  Median_Age_Person_AsianAlone: "Median Age (Asian Alone)",
  Median_Age_Person_BlackOrAfricanAmericanAlone:
    "Median Age (Black or African American)",
  Median_Age_Person_HispanicOrLatino: "Median Age (Hispanic or Latino)",
  Median_Age_Person_NativeHawaiianAndOtherPacificIslanderAlone:
    "Median Age (Native Hawaiian and Pacific Islander)",
  Median_Age_Person_SomeOtherRaceAlone: "Median Age (Some other race)",
  Median_Age_Person_TwoOrMoreRaces: "Median Age (Two or More Races)",
  Median_Age_Person_WhiteAlone: "Median Age (White Alone)",

  // income
  Count_Person_IncomeOfUpto9999USDollar:
    "People with Individual Income (Under $10K)",
  Count_Person_IncomeOf10000To14999USDollar:
    "People with Individual Income ($10K to $15K)",
  Count_Person_IncomeOf15000To24999USDollar:
    "People with Individual Income ($15K to $25K)",
  Count_Person_IncomeOf25000To34999USDollar:
    "People with Individual Income ($25K to $35K)",
  Count_Person_IncomeOf35000To49999USDollar:
    "People with Individual Income ($35K to $50K)",
  Count_Person_IncomeOf50000To64999USDollar:
    "People with Individual Income ($50K to $65K)",
  Count_Person_IncomeOf65000To74999USDollar:
    "People with Individual Income ($65K to $75K)",
  Count_Person_IncomeOf75000OrMoreUSDollar:
    "People with Individual Income (Over $75K)",

  // marital status
  Count_Person_MarriedAndNotSeparated: "Population (Married And Not Separated)",
  Count_Person_Divorced: "Population (Divorced)",
  Count_Person_NeverMarried: "Population (Never Married)",
  Count_Person_Widowed: "Population (Widowed)",
  Count_Person_Separated: "Population (Separated)",

  // living situation
  "WorldBank/SP_URB_TOTL": "Population (Urban)",
  "WorldBank/SP_RUR_TOTL": "Population (Rural)",

  // education/poulation
  Count_Person_EducationalAttainmentNoSchoolingCompleted:
    "Population (No Schooling)",
  Count_Person_EducationalAttainmentRegularHighSchoolDiploma:
    "Population (High School)",
  Count_Person_EducationalAttainmentBachelorsDegree: "Population (Bachelors)",
  Count_Person_EducationalAttainmentMastersDegree: "Population (Masters)",
  Count_Person_EducationalAttainmentDoctorateDegree: "Population (Doctorate)",

  // household/income
  Count_Household_IncomeOfUpto10000USDollar:
    "Households with Income (Under $10K)",
  Count_Household_IncomeOf10000To14999USDollar:
    "Households with Income ($10K to $15K)",
  Count_Household_IncomeOf20000To24999USDollar:
    "Households with Income ($20K to $25K)",
  Count_Household_IncomeOf30000To34999USDollar:
    "Households with Income ($30K to $35K)",
  Count_Household_IncomeOf40000To44999USDollar:
    "Households with Income ($40K to $45K)",
  Count_Household_IncomeOf50000To59999USDollar:
    "Households with Income ($50K to $60K)",
  Count_Household_IncomeOf60000To74999USDollar:
    "Households with Income ($60K to $75K)",
  Count_Household_IncomeOf75000To99999USDollar:
    "Households with Income ($75K to $100K)",
  Count_Household_IncomeOf100000To124999USDollar:
    "Households with Income ($100K to $125K)",
  Count_Household_IncomeOf125000To149999USDollar:
    "Households with Income ($125K to $150K)",
  Count_Household_IncomeOf150000To199999USDollar:
    "Households with Income ($150K to $200K)",
  Count_Household_IncomeOf200000OrMoreUSDollar:
    "Households with Income (Over $200K)",

  Median_Income_Household: "Median Household Income",

  // COVID-19
  CumulativeCount_MedicalConditionIncident_COVID_19_ConfirmedOrProbableCase:
    "COVID-19 Cumulative Cases",
  CumulativeCount_MedicalConditionIncident_COVID_19_PatientDeceased:
    "COVID-19 Cumulative Deaths",

  // Citizenship
  Count_Person_USCitizenBornInTheUnitedStates: "Population (Born in USA)",
  Count_Person_USCitizenByNaturalization:
    "Population (Citizen by Naturalization)",
  Count_Person_NotAUSCitizen: "Population (Not a Citizen)",
  Count_Person_USCitizenBornAbroadOfAmericanParents: "Population (Born Abroad)",

  // Mortality
  "WorldBank/SP_DYN_IMRT_IN": "Infant Mortality Rate",

  // Mortality cause
  Count_Death_DiseasesOfTheCirculatorySystem:
    "Deaths Caused By Diseases of the Circulatory System",
  Count_Death_Neoplasms: "Deaths Caused By Neoplasms",
  Count_Death_DiseasesOfTheRespiratorySystem:
    "Deaths Caused By Diseases of the Respiratory System",
  Count_Death_ExternalCauses: "Deaths Caused By External Causes",
  Count_Death_DiseasesOfTheNervousSystem:
    "Deaths Caused By Diseases of the jNervous System",

  // Outcomes
  Percent_Person_WithHighCholesterol:
    "Percentage of People with High Cholesterol",
  Percent_Person_WithHighBloodPressure:
    "Percentage of People with High Blood Pressure",
  Percent_Person_WithArthritis: "Percentage of People with Arthritis",
  Percent_Person_WithMentalHealthNotGood:
    "Percentage of People with Mental Health Not Good",
  Percent_Person_WithPhysicalHealthNotGood:
    "Percentage of People with Physical Health Not Good",
  "WorldBank/SH_STA_WAST_ZS": "Wasting among Children under 5",
  "WorldBank/SH_SVR_WAST_ZS": "Severe Wasting among Children under 5",

  // Behaviors
  Percent_Person_SleepLessThan7Hours:
    "Percentage of People Who Sleep Less Than 7 Hours",
  Percent_Person_Obesity: "Percentage of People with Obesity",
  Percent_Person_BingeDrinking: "Percentage of People That Binge Drink",
  Percent_Person_PhysicalInactivity:
    "Percentage of People with Physical Inactivity",
  Percent_Person_Smoking: "Percentage of People That Smoke",
  "WorldBank/SH_ALC_PCAP_LI": "Alcohol Consumption Per Capita (Annual)",

  // Drug Prescribed
  RetailDrugDistribution_DrugDistribution_Oxycodone:
    "Total Retail Drug Distribution of Oxycodone",
  RetailDrugDistribution_DrugDistribution_Hydrocodone:
    "Total Retail Drug Distribution of Hydrocodone",
  RetailDrugDistribution_DrugDistribution_Codeine:
    "Total Retail Drug Distribution of Codeine",
  RetailDrugDistribution_DrugDistribution_Amphetamine:
    "Total Retail Drug Distribution of Amphetamine",
  RetailDrugDistribution_DrugDistribution_Morphine:
    "Total Retail Drug Distribution of Morphine",

  // School Enrollment
  Count_Person_EnrolledInSchool: "Population (Enrolled in School)",
  Count_Person_NotEnrolledInSchool: "Population (Not Enrolled in School)",

  // Crime
  Count_CriminalActivities_CombinedCrime:
    "Criminal Activity Count (Combined Crimes)",
  Count_CriminalActivities_ViolentCrime:
    "Criminal Activity Count (Violent Crimes)",
  Count_CriminalActivities_PropertyCrime:
    "Criminal Activity Count (Property Crimes)",
  Count_CriminalActivities_Arson: "Criminal Activity Count (Arson)",

  // Employment
  UnemploymentRate_Person_Male: "Unemployment Rate (Male)",
  UnemploymentRate_Person_Female: "Unemployment Rate (Female)",

  // Inequality
  Count_Person_BelowPovertyLevelInThePast12Months_AmericanIndianOrAlaskaNativeAlone:
    "Population Below Poverty Level in the Past 12 Months (American Indian or Alaska Native)",
  Count_Person_BelowPovertyLevelInThePast12Months_AsianAlone:
    "Population Below Poverty Level in the Past 12 Months (Asian)",
  Count_Person_BelowPovertyLevelInThePast12Months_BlackOrAfricanAmericanAlone:
    "Population Below Poverty Level in the Past 12 Months (Black or African American)",
  Count_Person_BelowPovertyLevelInThePast12Months_HispanicOrLatino:
    "Population Below Poverty Level in the Past 12 Months (Hispanic or Latino)",
  Count_Person_BelowPovertyLevelInThePast12Months_NativeHawaiianOrOtherPacificIslanderAlone:
    "Population Below Poverty Level in the Past 12 Months (Native Hawaiian or Other Paciific Islander)",
  Count_Person_BelowPovertyLevelInThePast12Months_WhiteAlone:
    "Population Below Poverty Level in the Past 12 Months (White)",

  Median_Income_Person_15OrMoreYears_Male_WithIncome:
    "Median Individual Income (Male)",
  Median_Income_Person_15OrMoreYears_Female_WithIncome:
    "Median Individual Income (Female)",

  Count_Person_Female_BelowPovertyLevelInThePast12Months:
    "Population Below Poverty Level in the Past 12 Months (Female)",
  Count_Person_Male_BelowPovertyLevelInThePast12Months:
    "Population Below Poverty Level in the Past 12 Months (Male)",

  Median_Income_Household_HouseholderRaceAmericanIndianOrAlaskaNativeAlone:
    "Median Individual Income (American Indian or Alaska Native)",
  Median_Income_Household_HouseholderRaceAsianAlone:
    "Median Individual Income (Asian)",
  Median_Income_Household_HouseholderRaceBlackOrAfricanAmericanAlone:
    "Median Individual Income (Black or African American)",
  Median_Income_Household_HouseholderRaceHispanicOrLatino:
    "Median Individual Income (Hispanic or Latino)",
  Median_Income_Household_HouseholderRaceNativeHawaiianOrOtherPacificIslanderAlone:
    "Median Individual Income (Native Hawaiian or Other Pacific Islander)",
  Median_Income_Household_HouseholderRaceWhiteAlone:
    "Median Individual Income (White)",

  Percent_Person_18To64Years_Female_NoHealthInsurance:
    "Percentage of Females without Health Insurance",
  Percent_Person_18To64Years_Male_NoHealthInsurance:
    "Percentage of Males without Health Insurance",

  Percent_Person_18To64Years_NoHealthInsurance_BlackOrAfricanAmericanAlone:
    "Percentage of Blacks Or African Americans without Health Insurance",
  Percent_Person_18To64Years_NoHealthInsurance_HispanicOrLatino:
    "Percentage of Hispanics or Latinos without Health Insurance",
  Percent_Person_18To64Years_NoHealthInsurance_WhiteAlone:
    "Percentage of Whites without Health Insurance",

  Count_Person_25To34Years_EducationalAttainmentAssociatesDegree_Female:
    "Count of Females with Associates Degrees",
  Count_Person_25To34Years_EducationalAttainmentAssociatesDegree_Male:
    "Count of Males with Associates Degrees",
  Count_Person_25To34Years_EducationalAttainmentBachelorsDegree_Female:
    "Count of Females with Bachelors Degrees",
  Count_Person_25To34Years_EducationalAttainmentBachelorsDegree_Male:
    "Count of Males with Bachelors Degrees",
  Count_Person_25To34Years_EducationalAttainmentGraduateOrProfessionalDegree_Female:
    "Count of Females with Graduate or Professional Degrees",
  Count_Person_25To34Years_EducationalAttainmentGraduateOrProfessionalDegree_Male:
    "Count of Males with Graduate or Professional Degrees",

  "WorldBank/SL_TLF_0714_FE_ZS": "Children Ages 7-14 in Employment (Female)",
  "WorldBank/SL_TLF_0714_MA_ZS": "Children Ages 7-14 in Employment (Male)",

  "WorldBank/SP_DYN_IMRT_FE_IN": "Infant Mortality Rate (Female)",
  "WorldBank/SP_DYN_IMRT_MA_IN": "Infant Mortality Rate (Male)",

  "WorldBank/SH_STA_WAST_FE_ZS": "Wasting among Children under 5 (Female)",
  "WorldBank/SH_SVR_WAST_FE_ZS":
    "Severe Wasting among Children under 5 (Female)",
  "WorldBank/SH_STA_WAST_MA_ZS": "Wasting among Children under 5 (Male)",
  "WorldBank/SH_SVR_WAST_MA_ZS": "Severe Wasting among Children under 5 (Male)",

  "WorldBank/SI_POV_GINI": "Gini Index",
};

export { STATS_VAR_TITLES };
