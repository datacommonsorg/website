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
 * Chart labels for each stats var. Used to distinguish between stats var in
 * grouped charts.
 */
const STATS_VAR_LABEL: { [key: string]: string } = {
  // No PVs
  Median_Age_Person: "Median Age",
  Median_Income_Person: "Median Income",
  UnemploymentRate_Person: "Unemployment Rate",
  Count_UnemploymentInsuranceClaim_StateUnemploymentInsurance:
    "Unemployment Insurance Claim",
  Count_Person_Employed: "Employed People",
  Count_Person_InLaborForce: "People in Labor Force",
  Count_Person: "Total Population",
  Count_Person_PerArea: "Persons Per Area",
  LifeExpectancy_Person: "Life Expectancy",
  GrowthRate_Count_Person: "Population Growth Rate",
  FertilityRate_Person_Female: "Fertility Rate",
  Count_HousingUnit: "Housing Unit",

  // Economics
  Amount_EconomicActivity_GrossDomesticProduction_Nominal: "GDP",
  GrowthRate_Amount_EconomicActivity_GrossDomesticProduction: "GDP Growth Rate",
  Amount_Debt_Government: "Government Debt",
  Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita:
    "GDP Per Capita",
  Amount_EconomicActivity_GrossNationalIncome_PurchasingPowerParity_PerCapita:
    "GNI PPP Per Capita",
  Amount_EconomicActivity_GrossNationalIncome_PurchasingPowerParity: "GNI PPP",
  Count_Person_7To14Years_Employed_AsFractionOf_Count_Person_7To14Years:
    "Children in Employment",
  Amount_EconomicActivity_ExpenditureActivity_EducationExpenditure_Government_AsFractionOf_Amount_EconomicActivity_ExpenditureActivity_Government:
    "Government Expenditures on Education (% of Government Expenditures)",
  Amount_EconomicActivity_ExpenditureActivity_EducationExpenditure_Government_AsFractionOf_Amount_EconomicActivity_GrossDomesticProduction_Nominal:
    "Government Expenditures on Education (% of GDP)",
  Amount_EconomicActivity_ExpenditureActivity_MilitaryExpenditure_Government:
    "Government Expenditures on Military",
  Amount_EconomicActivity_ExpenditureActivity_MilitaryExpenditure_Government_AsFractionOf_Amount_EconomicActivity_GrossDomesticProduction_Nominal:
    "Government Expenditures on Military (% of GDP)",
  Amount_Stock: "Market Capitalization of Domestic Companies",
  Amount_Stock_AsFractionOf_Amount_EconomicActivity_GrossDomesticProduction_Nominal:
    "Market Capitalization of Domestic Companies (% of GDP)",
  Amount_Remittance_InwardRemittance: "Inward Remittance",
  Amount_Remittance_InwardRemittance_AsFractionOf_Amount_EconomicActivity_GrossDomesticProduction_Nominal:
    "Inward Remittance (% of GDP)",
  Amount_Remittance_OutwardRemittance: "Outward Remittance",
  Count_Person_15To64Years_InLaborForce_AsFractionOf_Count_Person_15To64Years:
    "People in Labor Force",

  // Environment
  Amount_Consumption_Energy_PerCapita: "Energy Consumption",
  Amount_Emissions_CarbonDioxide_PerCapita: "CO2 Emissions",
  Amount_Consumption_Electricity_PerCapita: "Electricity Consumption",
  Count_EarthquakeEvent: "Earthquake",
  Count_CycloneEvent: "Cyclone",
  Count_StormSurgeTideEvent: "Storm Surge Tide",
  Count_WildlandFireEvent: "Wildland Fire",
  Count_TornadoEvent: "Tornado",
  Count_ThunderstormWindEvent: "Thunderstorm",
  Count_FloodEvent: "Flood",
  Count_DroughtEvent: "Drought",

  // age
  Count_Person_Upto4Years: "0-4",
  Count_Person_Upto9Years: "0-9",
  Count_Person_5To9Years: "5-9",
  Count_Person_5To17Years: "5-17",
  Count_Person_10To14Years: "10-14",
  Count_Person_10To19Years: "10-19",
  Count_Person_15To19Years: "15-19",
  Count_Person_15OrMoreYears: "15+",
  Count_Person_16OrMoreYears: "16+",
  Count_Person_18To24Years: "18-24",
  Count_Person_20To24Years: "20-24",
  Count_Person_20To29Years: "20-29",
  Count_Person_25To29Years: "25-29",
  Count_Person_25To34Years: "25-34",
  Count_Person_30To34Years: "30-34",
  Count_Person_30To39Years: "30-39",
  Count_Person_35To39Years: "35-39",
  Count_Person_35To44Years: "35-44",
  Count_Person_40To44Years: "40-44",
  Count_Person_40To49Years: "40-49",
  Count_Person_45To49Years: "45-49",
  Count_Person_45To54Years: "45-54",
  Count_Person_50To54Years: "50-54",
  Count_Person_50To59Years: "50-59",
  Count_Person_55To59Years: "55-59",
  Count_Person_55To64Years: "55-64",
  Count_Person_60To61Years: "60-61",
  Count_Person_60To64Years: "60-64",
  Count_Person_60To69Years: "60-69",
  Count_Person_62To64Years: "62-64",
  Count_Person_65To69Years: "65-69",
  Count_Person_65To74Years: "65-74",
  Count_Person_70To74Years: "70-74",
  Count_Person_70To79Years: "70-79",
  Count_Person_70OrMoreYears: "70+",
  Count_Person_75To79Years: "75-79",
  Count_Person_75OrMoreYears: "75+",
  Count_Person_80To84Years: "80-84",
  Count_Person_80OrMoreYears: "80+",
  // gender
  Count_Person_Male: "Male",
  Count_Person_Female: "Female",
  Median_Age_Person_Male: "Male",
  Median_Age_Person_Female: "Female",
  // race
  Count_Person_AmericanIndianOrAlaskaNativeAlone:
    "American Indian or Alaska Native",
  Count_Person_AsianAlone: "Asian Alone",
  Count_Person_BlackOrAfricanAmericanAlone: "Black or African American",
  Count_Person_HispanicOrLatino: "Hispanic or Latino",
  Count_Person_NativeHawaiianAndOtherPacificIslanderAlone:
    "Native Hawaiian and Pacific Islander",
  Count_Person_SomeOtherRaceAlone: "Some Other Race",
  Count_Person_TwoOrMoreRaces: "Two or More Races",
  Count_Person_WhiteAlone: "White Alone",

  Count_HousingUnit_HouseholderRaceAmericanIndianOrAlaskaNativeAlone:
    "American Indian or Alaska Native",
  Count_HousingUnit_HouseholderRaceAsianAlone: "Asian Alone",
  Count_HousingUnit_HouseholderRaceBlackOrAfricanAmericanAlone:
    "Black or African American",
  Count_HousingUnit_HouseholderRaceHispanicOrLatino: "Hispanic or Latino",
  Count_HousingUnit_HouseholderRaceNativeHawaiianAndOtherPacificIslanderAlone:
    "Native Hawaiian and Pacific Islander",
  Count_HousingUnit_HouseholderRaceSomeOtherRaceAlone: "Some Other Race",
  Count_HousingUnit_HouseholderRaceTwoOrMoreRaces: "Two or More Races",
  Count_HousingUnit_HouseholderRaceWhiteAlone: "White Alone",

  Median_Age_Person_AmericanIndianOrAlaskaNativeAlone:
    "American Indian or Alaska Native",
  Median_Age_Person_AsianAlone: "Asian Alone",
  Median_Age_Person_BlackOrAfricanAmericanAlone: "Black or African American",
  Median_Age_Person_HispanicOrLatino: "Hispanic or Latino",
  Median_Age_Person_NativeHawaiianAndOtherPacificIslanderAlone:
    "Native Hawaiian and Pacific Islander",
  Median_Age_Person_SomeOtherRaceAlone: "Some Other Race",
  Median_Age_Person_TwoOrMoreRaces: "Two or More Races",
  Median_Age_Person_WhiteAlone: "White Alone",
  // income
  Count_Person_IncomeOfUpto9999USDollar: "Under $10K",
  Count_Person_IncomeOf10000To14999USDollar: "$10K to $15K",
  Count_Person_IncomeOf15000To24999USDollar: "$15K to $25K",
  Count_Person_IncomeOf25000To34999USDollar: "$25K to $35K",
  Count_Person_IncomeOf35000To49999USDollar: "$35K to $50K",
  Count_Person_IncomeOf50000To64999USDollar: "$50K to $65K",
  Count_Person_IncomeOf65000To74999USDollar: "$65K to $75K",
  Count_Person_IncomeOf75000OrMoreUSDollar: "Over $75K",
  // marital status
  Count_Person_MarriedAndNotSeparated: "Married",
  Count_Person_Divorced: "Divorced",
  Count_Person_NeverMarried: "Never Married",
  Count_Person_Widowed: "Widowed",
  Count_Person_Separated: "Separated",
  // living situation
  Count_Person_Urban: "Urban Population",
  Count_Person_Rural: "Rural Population",
  // education/poulation
  Count_Person_EducationalAttainmentNoSchoolingCompleted: "No Schooling",
  Count_Person_EducationalAttainmentRegularHighSchoolDiploma: "High School",
  Count_Person_EducationalAttainmentBachelorsDegree: "Bachelors",
  Count_Person_EducationalAttainmentMastersDegree: "Masters",
  Count_Person_EducationalAttainmentDoctorateDegree: "Doctorate",
  // household/income
  Count_Household_IncomeOfUpto10000USDollar: "Under $10K",
  Count_Household_IncomeOf10000To14999USDollar: "$10K to $15K",
  Count_Household_IncomeOf20000To24999USDollar: "$20K to $25K",
  Count_Household_IncomeOf30000To34999USDollar: "$30K to $35K",
  Count_Household_IncomeOf40000To44999USDollar: "$40K to $45K",
  Count_Household_IncomeOf50000To59999USDollar: "$50K to $60K",
  Count_Household_IncomeOf60000To74999USDollar: "$60K to $75K",
  Count_Household_IncomeOf75000To99999USDollar: "$75K to $100K",
  Count_Household_IncomeOf100000To124999USDollar: "$100K to $125K",
  Count_Household_IncomeOf125000To149999USDollar: "$125K to $150K",
  Count_Household_IncomeOf150000To199999USDollar: "$150K to $200K",
  Count_Household_IncomeOf200000OrMoreUSDollar: "Over $200K",
  Median_Income_Household: "Median Household Income",
  // COVID-19
  CumulativeCount_MedicalConditionIncident_COVID_19_ConfirmedOrProbableCase:
    "COVID-19 Cumulative Cases",
  CumulativeCount_MedicalConditionIncident_COVID_19_PatientDeceased:
    "COVID-19 Cumulative Deaths",
  // Citizenship
  Count_Person_USCitizenBornInTheUnitedStates: "Born in USA",
  Count_Person_USCitizenByNaturalization: "Citizen by Naturalization",
  Count_Person_NotAUSCitizen: "Not a Citizen",
  Count_Person_USCitizenBornAbroadOfAmericanParents: "Born Abroad",
  // Mortality
  Count_Death_0Years_AsFractionOf_Count_BirthEvent_LiveBirth:
    "Infant Mortality Rate",
  // Mortality cause
  Count_Death_DiseasesOfTheCirculatorySystem: "Circulatory System",
  Count_Death_Neoplasms: "Neoplasms",
  Count_Death_DiseasesOfTheRespiratorySystem: "Respiratory System",
  Count_Death_ExternalCauses: "External Causes",
  Count_Death_DiseasesOfTheNervousSystem: "Nervous System",
  // Outcomes
  Percent_Person_WithHighCholesterol: "High Cholesterol",
  Percent_Person_WithHighBloodPressure: "High Blood Pressure",
  Percent_Person_WithArthritis: "Arthritis",
  Percent_Person_WithMentalHealthNotGood: "Mental Health Not Good",
  Percent_Person_WithPhysicalHealthNotGood: "Physical Health Not Good",
  Count_Person_Upto4Years_Wasting_AsFractionOf_Count_Person_Upto4Years:
    "Wasted Children under 5",
  Count_Person_Upto4Years_SevereWasting_AsFractionOf_Count_Person_Upto4Years:
    "Severely Wasted Children under 5",
  // Behaviors
  Percent_Person_SleepLessThan7Hours: "Sleep Less Than 7 Hours",
  Percent_Person_Obesity: "Obesity",
  Percent_Person_BingeDrinking: "Binge Drinking",
  Percent_Person_PhysicalInactivity: "Physical Inactivity",
  Percent_Person_Smoking: "Smoking",
  Amount_Consumption_Alcohol_15OrMoreYears_AsFractionOf_Count_Person_15OrMoreYears:
    "Pure Alcohol Consumption",
  // Drug Prescribed
  RetailDrugDistribution_DrugDistribution_Oxycodone: "Oxycodone",
  RetailDrugDistribution_DrugDistribution_Hydrocodone: "Hydrocodone",
  RetailDrugDistribution_DrugDistribution_Codeine: "Codeine",
  RetailDrugDistribution_DrugDistribution_Amphetamine: "Amphetamine",
  RetailDrugDistribution_DrugDistribution_Morphine: "Morphine",
  // School Enrollment
  Count_Person_EnrolledInSchool: "Enrolled in School",
  Count_Person_NotEnrolledInSchool: "Not Enrolled in School",
  // Crime
  Count_CriminalActivities_CombinedCrime: "Combined Crimes",
  Count_CriminalActivities_ViolentCrime: "Violent Crimes",
  Count_CriminalActivities_PropertyCrime: "Property Crimes",
  Count_CriminalActivities_Arson: "Arson",
  // Employment
  UnemploymentRate_Person_Male: "Male",
  UnemploymentRate_Person_Female: "Female",
  // Inequality
  Count_Person_BelowPovertyLevelInThePast12Months_AmericanIndianOrAlaskaNativeAlone:
    "American Indian or Alaska Native",
  Count_Person_BelowPovertyLevelInThePast12Months_AsianAlone: "Asian",
  Count_Person_BelowPovertyLevelInThePast12Months_BlackOrAfricanAmericanAlone:
    "Black or African American",
  Count_Person_BelowPovertyLevelInThePast12Months_HispanicOrLatino:
    "Hispanic or Latino",
  Count_Person_BelowPovertyLevelInThePast12Months_NativeHawaiianOrOtherPacificIslanderAlone:
    "Native Hawaiian or Other Paciific Islander",
  Count_Person_BelowPovertyLevelInThePast12Months_WhiteAlone: "White",
  Median_Income_Person_15OrMoreYears_Male_WithIncome: "Male",
  Median_Income_Person_15OrMoreYears_Female_WithIncome: "Female",
  Count_Person_Female_BelowPovertyLevelInThePast12Months: "Female",
  Count_Person_Male_BelowPovertyLevelInThePast12Months: "Male",
  Median_Income_Household_HouseholderRaceAmericanIndianOrAlaskaNativeAlone:
    "American Indian or Alaska Native",
  Median_Income_Household_HouseholderRaceAsianAlone: "Asian",
  Median_Income_Household_HouseholderRaceBlackOrAfricanAmericanAlone:
    "Black or African American",
  Median_Income_Household_HouseholderRaceHispanicOrLatino: "Hispanic or Latino",
  Median_Income_Household_HouseholderRaceNativeHawaiianOrOtherPacificIslanderAlone:
    "Native Hawaiian or Other Pacific Islander",
  Median_Income_Household_HouseholderRaceWhiteAlone: "White",
  Percent_Person_18To64Years_Female_NoHealthInsurance: "Female",
  Percent_Person_18To64Years_Male_NoHealthInsurance: "Male",
  Percent_Person_18To64Years_NoHealthInsurance_BlackOrAfricanAmericanAlone:
    "Black Or African American",
  Percent_Person_18To64Years_NoHealthInsurance_HispanicOrLatino:
    "Hispanic or Latino",
  Percent_Person_18To64Years_NoHealthInsurance_WhiteAlone: "White",
  Count_Person_25To34Years_EducationalAttainmentAssociatesDegree_Female:
    "Female",
  Count_Person_25To34Years_EducationalAttainmentAssociatesDegree_Male: "Male",
  Count_Person_25To34Years_EducationalAttainmentBachelorsDegree_Female:
    "Female",
  Count_Person_25To34Years_EducationalAttainmentBachelorsDegree_Male: "Male",
  Count_Person_25To34Years_EducationalAttainmentGraduateOrProfessionalDegree_Female:
    "Female",
  Count_Person_25To34Years_EducationalAttainmentGraduateOrProfessionalDegree_Male:
    "Male",

  Count_Person_7To14Years_Female_Employed_AsFractionOf_Count_Person_7To14Years_Female:
    "Female",
  Count_Person_7To14Years_Male_Employed_AsFractionOf_Count_Person_7To14Years_Male:
    "Male",

  Count_Death_0Years_Female_AsFractionOf_Count_BirthEvent_LiveBirth_Female:
    "Female",
  Count_Death_0Years_Male_AsFractionOf_Count_BirthEvent_LiveBirth_Male: "Male",

  Count_Person_Upto4Years_Female_Wasting_AsFractionOf_Count_Person_Upto4Years_Female:
    "Female",
  Count_Person_Upto4Years_Female_SevereWasting_AsFractionOf_Count_Person_Upto4Years_Female:
    "Female",
  Count_Person_Upto4Years_Male_Wasting_AsFractionOf_Count_Person_Upto4Years_Male:
    "Male",
  Count_Person_Upto4Years_Male_SevereWasting_AsFractionOf_Count_Person_Upto4Years_Male:
    "Male",

  GiniIndex_EcconomicActivity: "Gini Index",

  // Housing
  Count_HousingUnit_HomeValueUpto49999USDollar: "0 - $50K",
  Count_HousingUnit_HomeValue50000To99999USDollar: "$50K - $100K",
  Count_HousingUnit_HomeValue100000To199999USDollar: "$100K - $200K",
  Count_HousingUnit_HomeValue200000To299999USDollar: "$200K - $300K",
  Count_HousingUnit_HomeValue300000To499999USDollar: "$300K - $500K",
  Count_HousingUnit_HomeValue500000To999999USDollar: "$500K - $1M",
  Count_HousingUnit_HomeValue1000000To1499999USDollar: "$1M - $1.5M",
  Count_HousingUnit_HomeValue1500000To1999999USDollar: "$1.5M - $2M",
  Count_HousingUnit_HomeValue2000000OrMoreUSDollar: "$2M+",

  Count_HousingUnit_OwnerOccupied: "Owner",
  Count_HousingUnit_RenterOccupied: "Renter",

  Count_HousingUnit_Before1939DateBuilt: "Before 1939",
  Count_HousingUnit_1940To1949DateBuilt: "1940 - 1949",
  Count_HousingUnit_1950To1959DateBuilt: "1950 - 1959",
  Count_HousingUnit_1960To1969DateBuilt: "1960 - 1969",
  Count_HousingUnit_1970To1979DateBuilt: "1970 - 1979",
  Count_HousingUnit_1980To1989DateBuilt: "1980 - 1989",
  Count_HousingUnit_1990To1999DateBuilt: "1990 - 1999",
  Count_HousingUnit_2000To2009DateBuilt: "2000 - 2009",
  Count_HousingUnit_2010OrLaterDateBuilt: "After 2010",
};

export { STATS_VAR_LABEL };
