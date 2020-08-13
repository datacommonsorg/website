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

const STATS_VAR_TEXT: { [key: string]: string } = {
  // No PVs
  Median_Age_Person: "Median Age",
  Median_Income_Person: "Median Income",
  UnemploymentRate_Person: "Unemployment Rate",
  Count_UnemploymentInsuranceClaim_StateUnemploymentInsurance:
    "Unemployment Insurance Claim",
  Count_Person_Employed: "Employed People",
  Count_Person_InLaborForce: "People in Labor Force",
  Count_Person: "Total",
  Count_Person_PerArea: "Person per Area",
  LifeExpectancy_Person: "Life Expectancy",
  GrowthRate_Count_Person: "Population Growth Rate",
  FertilityRate_Person_Female: "Fertility Rate",

  // Economics
  Amount_EconomicActivity_GrossDomesticProduction_Nominal: "GDP",
  GrowthRate_Amount_EconomicActivity_GrossDomesticProduction: "GDP Growth Rate",
  Amount_Debt_Government: "GDP",
  Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita:
    "GDP Per Capita",
  Amount_EconomicActivity_GrossNationalIncome_PurchasingPowerParity_PerCapita:
    "GNI PPP Per Capita",
  Amount_EconomicActivity_GrossNationalIncome_PurchasingPowerParity: "GNI PPP",

  // Environment
  Amount_Consumption_Energy_PerCapita: "Energy comsumption Per Capita",
  Amount_Emissions_CarbonDioxide_PerCapita: "CO2 Emissions Per Capita",
  Amount_Consumption_Electricity_PerCapita:
    "Electricity Consumption Per Capita",
  Count_EarthquakeEvent: "Earthquake Event",
  Count_CycloneEvent: "Cyclone Event",

  // age
  Count_Person_Upto5Years: "0-5",
  Count_Person_5To17Years: "5-17",
  Count_Person_15To19Years: "15-19",
  Count_Person_20To24Years: "20-24",
  Count_Person_25To29Years: "25-29",
  Count_Person_25To34Years: "25-34",
  Count_Person_30To34Years: "30-34",
  Count_Person_35To39Years: "35-39",
  Count_Person_35To44Years: "35-44",
  Count_Person_40To44Years: "40-44",
  Count_Person_45To49Years: "45-49",
  Count_Person_45To54Years: "45-54",
  Count_Person_50To54Years: "50-54",
  Count_Person_55To59Years: "55-59",
  Count_Person_60To64Years: "60-64",
  Count_Person_65To69Years: "65-69",
  Count_Person_65OrMoreYears: "65+",
  Count_Person_70To74Years: "70-74",
  Count_Person_75To79Years: "75-79",
  Count_Person_80To84Years: "80-84",
  Count_Person_85To89Years: "85-89",
  // gender
  Count_Person_Male: "Male",
  Count_Person_Female: "Female",
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
  // Behaviors
  Percent_Person_SleepLessThan7Hours: "Sleep Less Than 7 Hours",
  Percent_Person_Obesity: "Obesity",
  Percent_Person_BingeDrinking: "Binge Drinking",
  Percent_Person_PhysicalInactivity: "Physical Inactivity",
  Percent_Person_Smoking: "Smoking",
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
};

export { STATS_VAR_TEXT };
