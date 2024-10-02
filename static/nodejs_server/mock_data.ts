/**
 * Copyright 2024 Google LLC
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

/* data used for mock functions for nodejs server tests. */

export const TIMELINE_NL_RESP = {
  data: {
    client: "ui_query",
    config: {
      categories: [
        {
          blocks: [
            {
              columns: [
                {
                  tiles: [
                    {
                      statVarKey: ["Mean_Income_Household_FamilyHousehold"],
                      title:
                        "Average Income for Family Households in North Dakota",
                      type: "LINE",
                    },
                  ],
                },
                {
                  tiles: [
                    {
                      description:
                        "Average Income for Family Households in North Dakota",
                      statVarKey: ["Mean_Income_Household_FamilyHousehold"],
                      title:
                        "Average Income for Family Households in North Dakota",
                      type: "HIGHLIGHT",
                    },
                  ],
                },
              ],
              title: "Average Income for Family Households",
            },
            {
              columns: [
                {
                  tiles: [
                    {
                      statVarKey: ["Mean_Income_Household_FamilyHousehold"],
                      title:
                        "Average Income for Family Households in Counties of North Dakota (${date})",
                      type: "MAP",
                    },
                  ],
                },
                {
                  tiles: [
                    {
                      rankingTileSpec: {
                        rankingCount: 5,
                        showHighestLowest: true,
                      },
                      statVarKey: ["Mean_Income_Household_FamilyHousehold"],
                      title:
                        "Average Income for Family Households in Counties of North Dakota (${date})",
                      type: "RANKING",
                    },
                  ],
                },
              ],
              title:
                "Average Income for Family Households in Counties of North Dakota",
            },
            {
              columns: [
                {
                  tiles: [
                    {
                      statVarKey: ["Median_Income_Household_FamilyHousehold"],
                      title: "Median Family Household Income in North Dakota",
                      type: "LINE",
                    },
                  ],
                },
                {
                  tiles: [
                    {
                      description:
                        "Median Family Household Income in North Dakota",
                      statVarKey: ["Median_Income_Household_FamilyHousehold"],
                      title: "Median Family Household Income in North Dakota",
                      type: "HIGHLIGHT",
                    },
                  ],
                },
              ],
              title: "Median Family Household Income",
            },
            {
              columns: [
                {
                  tiles: [
                    {
                      statVarKey: [
                        "Mean_IncomeDeficit_Household_MarriedCoupleFamilyHousehold",
                      ],
                      title:
                        "Mean Income Deficit of Household: Married Couple Family Household in Counties of North Dakota (${date})",
                      type: "MAP",
                    },
                  ],
                },
                {
                  tiles: [
                    {
                      rankingTileSpec: {
                        rankingCount: 5,
                        showHighestLowest: true,
                      },
                      statVarKey: [
                        "Mean_IncomeDeficit_Household_MarriedCoupleFamilyHousehold",
                      ],
                      title:
                        "Mean Income Deficit of Household: Married Couple Family Household in Counties of North Dakota (${date})",
                      type: "RANKING",
                    },
                  ],
                },
              ],
              title:
                "Mean Income Deficit of Household: Married Couple Family Household in Counties of North Dakota",
            },
          ],
          statVarSpec: {
            Mean_IncomeDeficit_Household_MarriedCoupleFamilyHousehold: {
              name: "Mean Income Deficit of Household: Married Couple Family Household",
              statVar:
                "Mean_IncomeDeficit_Household_MarriedCoupleFamilyHousehold",
            },
            Mean_Income_Household_FamilyHousehold: {
              name: "Average Income for Family Households",
              statVar: "Mean_Income_Household_FamilyHousehold",
            },
            Median_Income_Household_FamilyHousehold: {
              name: "Median Family Household Income",
              statVar: "Median_Income_Household_FamilyHousehold",
            },
          },
        },
      ],
      metadata: {
        containedPlaceTypes: {
          State: "County",
        },
        placeDcid: ["geoId/38"],
      },
    },
    context: [],
    debug: {},
    entities: [],
    pastSourceContext: "",
    place: {
      dcid: "geoId/38",
      name: "North Dakota",
      place_type: "State",
    },
    placeFallback: {},
    placeSource: "CURRENT_QUERY",
    places: [
      {
        dcid: "geoId/38",
        name: "North Dakota",
        place_type: "State",
      },
    ],
  },
};

export const HOUSEHOLD_INCOME_LATEST_POINTS_RESP = {
  data: {
    data: {
      Mean_Income_Household_FamilyHousehold: {
        "geoId/38001": {
          date: "2019",
          facet: "1107922769",
          value: 95285,
        },
        "geoId/38003": {
          date: "2019",
          facet: "1107922769",
          value: 103463,
        },
        "geoId/38005": {
          date: "2019",
          facet: "1107922769",
          value: 69206,
        },
        "geoId/38007": {
          date: "2019",
          facet: "1107922769",
          value: 109227,
        },
        "geoId/38009": {
          date: "2019",
          facet: "1107922769",
          value: 96472,
        },
        "geoId/38011": {
          date: "2019",
          facet: "1107922769",
          value: 99169,
        },
        "geoId/38013": {
          date: "2019",
          facet: "1107922769",
          value: 113710,
        },
        "geoId/38015": {
          date: "2019",
          facet: "1107922769",
          value: 115103,
        },
        "geoId/38017": {
          date: "2019",
          facet: "1107922769",
          value: 114000,
        },
        "geoId/38019": {
          date: "2019",
          facet: "1107922769",
          value: 105668,
        },
        "geoId/38021": {
          date: "2019",
          facet: "1107922769",
          value: 98416,
        },
        "geoId/38023": {
          date: "2019",
          facet: "1107922769",
          value: 118649,
        },
        "geoId/38025": {
          date: "2019",
          facet: "1107922769",
          value: 122699,
        },
        "geoId/38027": {
          date: "2019",
          facet: "1107922769",
          value: 97736,
        },
        "geoId/38029": {
          date: "2019",
          facet: "1107922769",
          value: 88635,
        },
        "geoId/38031": {
          date: "2019",
          facet: "1107922769",
          value: 101545,
        },
        "geoId/38033": {
          date: "2019",
          facet: "1107922769",
          value: 83331,
        },
        "geoId/38035": {
          date: "2019",
          facet: "1107922769",
          value: 96731,
        },
        "geoId/38037": {
          date: "2019",
          facet: "1107922769",
          value: 87915,
        },
        "geoId/38039": {
          date: "2019",
          facet: "1107922769",
          value: 96860,
        },
        "geoId/38041": {
          date: "2019",
          facet: "1107922769",
          value: 99532,
        },
        "geoId/38043": {
          date: "2019",
          facet: "1107922769",
          value: 78656,
        },
        "geoId/38045": {
          date: "2019",
          facet: "1107922769",
          value: 101184,
        },
        "geoId/38047": {
          date: "2019",
          facet: "1107922769",
          value: 86644,
        },
        "geoId/38049": {
          date: "2019",
          facet: "1107922769",
          value: 105216,
        },
        "geoId/38051": {
          date: "2019",
          facet: "1107922769",
          value: 75949,
        },
        "geoId/38053": {
          date: "2019",
          facet: "1107922769",
          value: 117604,
        },
        "geoId/38055": {
          date: "2019",
          facet: "1107922769",
          value: 94736,
        },
        "geoId/38057": {
          date: "2019",
          facet: "1107922769",
          value: 101378,
        },
        "geoId/38059": {
          date: "2019",
          facet: "1107922769",
          value: 111901,
        },
        "geoId/38061": {
          date: "2019",
          facet: "1107922769",
          value: 118316,
        },
        "geoId/38063": {
          date: "2019",
          facet: "1107922769",
          value: 95849,
        },
        "geoId/38065": {
          date: "2019",
          facet: "1107922769",
          value: 101443,
        },
        "geoId/38067": {
          date: "2019",
          facet: "1107922769",
          value: 101660,
        },
        "geoId/38069": {
          date: "2019",
          facet: "1107922769",
          value: 76245,
        },
        "geoId/38071": {
          date: "2019",
          facet: "1107922769",
          value: 98588,
        },
        "geoId/38073": {
          date: "2019",
          facet: "1107922769",
          value: 95139,
        },
        "geoId/38075": {
          date: "2019",
          facet: "1107922769",
          value: 98086,
        },
        "geoId/38077": {
          date: "2019",
          facet: "1107922769",
          value: 91662,
        },
        "geoId/38079": {
          date: "2019",
          facet: "1107922769",
          value: 72908,
        },
        "geoId/38081": {
          date: "2019",
          facet: "1107922769",
          value: 94637,
        },
        "geoId/38083": {
          date: "2019",
          facet: "1107922769",
          value: 77781,
        },
        "geoId/38085": {
          date: "2019",
          facet: "1107922769",
          value: 56872,
        },
        "geoId/38087": {
          date: "2019",
          facet: "1107922769",
          value: 84180,
        },
        "geoId/38089": {
          date: "2019",
          facet: "1107922769",
          value: 116735,
        },
        "geoId/38091": {
          date: "2019",
          facet: "1107922769",
          value: 100933,
        },
        "geoId/38093": {
          date: "2019",
          facet: "1107922769",
          value: 90745,
        },
        "geoId/38095": {
          date: "2019",
          facet: "1107922769",
          value: 103983,
        },
        "geoId/38097": {
          date: "2019",
          facet: "1107922769",
          value: 96249,
        },
        "geoId/38099": {
          date: "2019",
          facet: "1107922769",
          value: 88830,
        },
        "geoId/38101": {
          date: "2019",
          facet: "1107922769",
          value: 101548,
        },
        "geoId/38103": {
          date: "2019",
          facet: "1107922769",
          value: 91620,
        },
        "geoId/38105": {
          date: "2019",
          facet: "1107922769",
          value: 126095,
        },
      },
    },
    facets: {
      "1107922769": {
        importName: "CensusACS5YearSurvey_SubjectTables_S1901",
        measurementMethod: "CensusACS5yrSurveySubjectTable",
        provenanceUrl:
          "https://data.census.gov/cedsci/table?q=S1901&tid=ACSST5Y2019.S1901",
        unit: "InflationAdjustedUSD_CurrentYear",
        unitDisplayName: "Infl. adj. USD (CY)",
      },
    },
  },
};

export const MEAN_HOUSEHOLD_INCOME_SERIES_RESP = {
  data: {
    data: {
      Mean_Income_Household_FamilyHousehold: {
        "geoId/38": {
          earliestDate: "2010",
          facet: "1107922769",
          latestDate: "2019",
          obsCount: 10,
          series: [
            {
              date: "2010",
              value: 75645,
            },
            {
              date: "2011",
              value: 79594,
            },
            {
              date: "2012",
              value: 83141,
            },
            {
              date: "2013",
              value: 86449,
            },
            {
              date: "2014",
              value: 90140,
            },
            {
              date: "2015",
              value: 93044,
            },
            {
              date: "2016",
              value: 96309,
            },
            {
              date: "2017",
              value: 99878,
            },
            {
              date: "2018",
              value: 103731,
            },
            {
              date: "2019",
              value: 105819,
            },
          ],
        },
      },
    },
    facets: {
      "1107922769": {
        importName: "CensusACS5YearSurvey_SubjectTables_S1901",
        measurementMethod: "CensusACS5yrSurveySubjectTable",
        provenanceUrl:
          "https://data.census.gov/cedsci/table?q=S1901&tid=ACSST5Y2019.S1901",
        unit: "InflationAdjustedUSD_CurrentYear",
        unitDisplayName: "Infl. adj. USD (CY)",
      },
    },
  },
};
export const MEDIAN_HOUSEHOLD_INCOME_SERIES_RESP = {
  data: {
    data: {
      Median_Income_Household_FamilyHousehold: {
        "geoId/38": {
          earliestDate: "2010",
          facet: "1107922769",
          latestDate: "2019",
          obsCount: 10,
          series: [
            {
              date: "2010",
              value: 62920,
            },
            {
              date: "2011",
              value: 65871,
            },
            {
              date: "2012",
              value: 68293,
            },
            {
              date: "2013",
              value: 70767,
            },
            {
              date: "2014",
              value: 72770,
            },
            {
              date: "2015",
              value: 74708,
            },
            {
              date: "2016",
              value: 77277,
            },
            {
              date: "2017",
              value: 80091,
            },
            {
              date: "2018",
              value: 83272,
            },
            {
              date: "2019",
              value: 86249,
            },
          ],
        },
      },
    },
    facets: {
      "1107922769": {
        importName: "CensusACS5YearSurvey_SubjectTables_S1901",
        measurementMethod: "CensusACS5yrSurveySubjectTable",
        provenanceUrl:
          "https://data.census.gov/cedsci/table?q=S1901&tid=ACSST5Y2019.S1901",
        unit: "InflationAdjustedUSD_CurrentYear",
        unitDisplayName: "Infl. adj. USD (CY)",
      },
    },
  },
};
export const NORTH_DAKOTA_NAME_RESP = {
  data: {
    "geoId/38": "North Dakota",
  },
};
export const NORTH_DAKOTA_COUNTY_NAMES_RESP = {
  data: {
    "geoId/38001": "geoId/38001",
    "geoId/38003": "geoId/38003",
    "geoId/38005": "geoId/38005",
    "geoId/38007": "geoId/38007",
    "geoId/38009": "geoId/38009",
    "geoId/38011": "geoId/38011",
    "geoId/38013": "geoId/38013",
    "geoId/38015": "geoId/38015",
    "geoId/38017": "geoId/38017",
    "geoId/38019": "geoId/38019",
    "geoId/38021": "geoId/38021",
    "geoId/38023": "geoId/38023",
    "geoId/38025": "geoId/38025",
    "geoId/38027": "geoId/38027",
    "geoId/38029": "geoId/38029",
    "geoId/38031": "geoId/38031",
    "geoId/38033": "geoId/38033",
    "geoId/38035": "geoId/38035",
    "geoId/38037": "geoId/38037",
    "geoId/38039": "geoId/38039",
    "geoId/38041": "geoId/38041",
    "geoId/38043": "geoId/38043",
    "geoId/38045": "geoId/38045",
    "geoId/38047": "geoId/38047",
    "geoId/38049": "geoId/38049",
    "geoId/38051": "geoId/38051",
    "geoId/38053": "geoId/38053",
    "geoId/38055": "geoId/38055",
    "geoId/38057": "geoId/38057",
    "geoId/38059": "geoId/38059",
    "geoId/38061": "geoId/38061",
    "geoId/38063": "geoId/38063",
    "geoId/38065": "geoId/38065",
    "geoId/38067": "geoId/38067",
    "geoId/38069": "geoId/38069",
    "geoId/38071": "geoId/38071",
    "geoId/38073": "geoId/38073",
    "geoId/38075": "geoId/38075",
    "geoId/38077": "geoId/38077",
    "geoId/38079": "geoId/38079",
    "geoId/38081": "geoId/38081",
    "geoId/38083": "geoId/38083",
    "geoId/38085": "geoId/38085",
    "geoId/38087": "geoId/38087",
    "geoId/38089": "geoId/38089",
    "geoId/38091": "geoId/38091",
    "geoId/38093": "geoId/38093",
    "geoId/38095": "geoId/38095",
    "geoId/38097": "geoId/38097",
    "geoId/38099": "geoId/38099",
    "geoId/38101": "geoId/38101",
    "geoId/38103": "geoId/38103",
    "geoId/38105": "geoId/38105",
  },
};

export const BAR_NL_RESP = {
  data: {
    client: "ui_query",
    config: {
      categories: [
        {
          blocks: [
            {
              columns: [
                {
                  tiles: [
                    {
                      barTileSpec: {
                        maxPlaces: 15,
                        maxVariables: 15,
                      },
                      comparisonPlaces: ["geoId/06085"],
                      statVarKey: [
                        "Count_Worker_NAICSAccommodationFoodServices_multiple_place_bar_block",
                        "Count_Worker_NAICSAdministrativeSupportWasteManagementRemediationServices_multiple_place_bar_block",
                        "Count_Worker_NAICSAgricultureForestryFishingHunting_multiple_place_bar_block",
                        "Count_Worker_NAICSConstruction_multiple_place_bar_block",
                        "Count_Worker_NAICSEducationalServices_multiple_place_bar_block",
                        "Count_Worker_NAICSHealthCareSocialAssistance_multiple_place_bar_block",
                        "dc/ndg1xk1e9frc2_multiple_place_bar_block",
                        "Count_Worker_NAICSFinanceInsurance_multiple_place_bar_block",
                        "Count_Worker_NAICSInformation_multiple_place_bar_block",
                        "Count_Worker_NAICSArtsEntertainmentRecreation_multiple_place_bar_block",
                        "Count_Worker_NAICSMiningQuarryingOilGasExtraction_multiple_place_bar_block",
                        "Count_Worker_NAICSOtherServices_multiple_place_bar_block",
                        "dc/8p97n7l96lgg8_multiple_place_bar_block",
                        "Count_Worker_NAICSUtilities_multiple_place_bar_block",
                        "dc/p69tpsldf99h7_multiple_place_bar_block",
                        "Count_Worker_NAICSRealEstateRentalLeasing_multiple_place_bar_block",
                        "Count_Worker_NAICSPublicAdministration_multiple_place_bar_block",
                        "Count_Worker_NAICSWholesaleTrade_multiple_place_bar_block",
                        "Count_Worker_NAICSProfessionalScientificTechnicalServices_multiple_place_bar_block",
                      ],
                      title:
                        "Categories of Jobs in Santa Clara County (${date})",
                      type: "BAR",
                    },
                  ],
                },
              ],
              denom: "Count_Person",
              title: "Categories of Jobs",
            },
          ],
          statVarSpec: {
            Count_Worker_NAICSAccommodationFoodServices_multiple_place_bar_block:
              {
                name: "Accomodation/Food Industry",
                statVar: "Count_Worker_NAICSAccommodationFoodServices",
              },
            Count_Worker_NAICSAdministrativeSupportWasteManagementRemediationServices_multiple_place_bar_block:
              {
                name: "Admin / Waste Management Service Industry",
                statVar:
                  "Count_Worker_NAICSAdministrativeSupportWasteManagementRemediationServices",
              },
            Count_Worker_NAICSAgricultureForestryFishingHunting_multiple_place_bar_block:
              {
                name: "Agriculture, Forestry, Fishing, Hunting",
                statVar: "Count_Worker_NAICSAgricultureForestryFishingHunting",
              },
            Count_Worker_NAICSArtsEntertainmentRecreation_multiple_place_bar_block:
              {
                name: "Arts, Entertainment, Recreation Industry",
                statVar: "Count_Worker_NAICSArtsEntertainmentRecreation",
              },
            Count_Worker_NAICSConstruction_multiple_place_bar_block: {
              name: "Construction Industry",
              statVar: "Count_Worker_NAICSConstruction",
            },
            Count_Worker_NAICSEducationalServices_multiple_place_bar_block: {
              name: "Educational Services Industry",
              statVar: "Count_Worker_NAICSEducationalServices",
            },
            Count_Worker_NAICSFinanceInsurance_multiple_place_bar_block: {
              name: "Finance and Insurance Industry",
              statVar: "Count_Worker_NAICSFinanceInsurance",
            },
            Count_Worker_NAICSHealthCareSocialAssistance_multiple_place_bar_block:
              {
                name: "Health Care and Social Assistance Industry",
                statVar: "Count_Worker_NAICSHealthCareSocialAssistance",
              },
            Count_Worker_NAICSInformation_multiple_place_bar_block: {
              name: "Information Industry",
              statVar: "Count_Worker_NAICSInformation",
            },
            Count_Worker_NAICSMiningQuarryingOilGasExtraction_multiple_place_bar_block:
              {
                name: "Mining, Quarrying, Oil and Gas Extraction Industry",
                statVar: "Count_Worker_NAICSMiningQuarryingOilGasExtraction",
              },
            Count_Worker_NAICSOtherServices_multiple_place_bar_block: {
              name: "Other Services (except Public Admin)",
              statVar: "Count_Worker_NAICSOtherServices",
            },
            Count_Worker_NAICSProfessionalScientificTechnicalServices_multiple_place_bar_block:
              {
                name: "Professional, Scientific, and Technical Services",
                statVar:
                  "Count_Worker_NAICSProfessionalScientificTechnicalServices",
              },
            Count_Worker_NAICSPublicAdministration_multiple_place_bar_block: {
              name: "Public Administration",
              statVar: "Count_Worker_NAICSPublicAdministration",
            },
            Count_Worker_NAICSRealEstateRentalLeasing_multiple_place_bar_block:
              {
                name: "Real Estate and Rental and Leasing",
                statVar: "Count_Worker_NAICSRealEstateRentalLeasing",
              },
            Count_Worker_NAICSUtilities_multiple_place_bar_block: {
              name: "Utilities",
              statVar: "Count_Worker_NAICSUtilities",
            },
            Count_Worker_NAICSWholesaleTrade_multiple_place_bar_block: {
              name: "Wholesale Trade",
              statVar: "Count_Worker_NAICSWholesaleTrade",
            },
            "dc/8p97n7l96lgg8_multiple_place_bar_block": {
              name: "Transportation And Warehousing",
              statVar: "dc/8p97n7l96lgg8",
            },
            "dc/ndg1xk1e9frc2_multiple_place_bar_block": {
              name: "Manufacturing",
              statVar: "dc/ndg1xk1e9frc2",
            },
            "dc/p69tpsldf99h7_multiple_place_bar_block": {
              name: "Retail Trade",
              statVar: "dc/p69tpsldf99h7",
            },
          },
        },
      ],
      metadata: {
        containedPlaceTypes: {
          County: "City",
        },
        placeDcid: ["geoId/06085"],
      },
    },
    context: [],
    entities: [],
    pastSourceContext: "",
    place: {
      dcid: "geoId/06085",
      name: "Santa Clara County",
      place_type: "County",
    },
    placeFallback: {},
    placeSource: "CURRENT_QUERY",
    places: [
      {
        dcid: "geoId/06085",
        name: "Santa Clara County",
        place_type: "County",
      },
    ],
    svSource: "CURRENT_QUERY",
    userMessages: [],
  },
};

export const BAR_POINTS_RESP = {
  data: {
    data: {
      Count_Worker_NAICSAccommodationFoodServices: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 82881,
        },
      },
      Count_Worker_NAICSAdministrativeSupportWasteManagementRemediationServices:
        {
          "geoId/06085": {
            date: "2023-06",
            facet: "3494118373",
            value: 60538,
          },
        },
      Count_Worker_NAICSAgricultureForestryFishingHunting: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 2960,
        },
      },
      Count_Worker_NAICSArtsEntertainmentRecreation: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 20764,
        },
      },
      Count_Worker_NAICSConstruction: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 53031,
        },
      },
      Count_Worker_NAICSEducationalServices: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 81663,
        },
      },
      Count_Worker_NAICSFinanceInsurance: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 20831,
        },
      },
      Count_Worker_NAICSHealthCareSocialAssistance: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 156124,
        },
      },
      Count_Worker_NAICSInformation: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 96168,
        },
      },
      Count_Worker_NAICSMiningQuarryingOilGasExtraction: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 142,
        },
      },
      Count_Worker_NAICSOtherServices: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 25214,
        },
      },
      Count_Worker_NAICSProfessionalScientificTechnicalServices: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 161223,
        },
      },
      Count_Worker_NAICSPublicAdministration: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 27668,
        },
      },
      Count_Worker_NAICSRealEstateRentalLeasing: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 15648,
        },
      },
      Count_Worker_NAICSUtilities: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 3527,
        },
      },
      Count_Worker_NAICSWholesaleTrade: {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 28183,
        },
      },
      "dc/8p97n7l96lgg8": {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 20846,
        },
      },
      "dc/ndg1xk1e9frc2": {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 176811,
        },
      },
      "dc/p69tpsldf99h7": {
        "geoId/06085": {
          date: "2023-06",
          facet: "3494118373",
          value: 72215,
        },
      },
    },
    facets: {
      "3494118373": {
        importName: "BLS_QCEW",
        observationPeriod: "P1M",
        provenanceUrl: "https://www.bls.gov/qcew/",
      },
    },
  },
};

export const BAR_FILTER_POINTS_RESP = {
  data: {
    data: {
      Count_Person: {
        "geoId/06085": {
          date: "2022",
          facet: "2176550201",
          value: 1870945,
        },
      },
    },
    facets: {
      "2176550201": {
        importName: "USCensusPEP_Annual_Population",
        measurementMethod: "CensusPEPSurvey",
        observationPeriod: "P1Y",
        provenanceUrl: "https://www2.census.gov/programs-surveys/popest/tables",
      },
    },
  },
};

export const SANTA_CLARA_NAME_RESP = {
  data: {
    "geoId/06085": "Santa Clara County",
  },
};

export const SCATTER_NL_RESP = {
  data: {
    client: "ui_query",
    config: {
      categories: [
        {
          blocks: [
            {
              columns: [
                {
                  tiles: [
                    {
                      scatterTileSpec: {
                        highlightTopRight: true,
                      },
                      statVarKey: [
                        "Percent_Person_Obesity_scatter",
                        "Count_Person_BelowPovertyLevelInThePast12Months_scatter",
                      ],
                      title:
                        "Prevalence of Obesity (${yDate}) Vs. Population Below Poverty Line (${xDate}) in Counties of California",
                      type: "SCATTER",
                    },
                  ],
                },
              ],
              denom: "Count_Person",
              title: "Prevalence of Obesity vs. Population Below poverty line",
            },
          ],
          statVarSpec: {
            Count_Person_BelowPovertyLevelInThePast12Months_scatter: {
              name: "Population Below poverty line",
              statVar: "Count_Person_BelowPovertyLevelInThePast12Months",
            },
            Percent_Person_Obesity_scatter: {
              name: "Prevalence of Obesity",
              noPerCapita: true,
              statVar: "Percent_Person_Obesity",
              unit: "%",
            },
          },
        },
      ],
      metadata: {
        containedPlaceTypes: {
          State: "County",
        },
        placeDcid: ["geoId/06"],
      },
    },
    context: [],
    entities: [],
    pastSourceContext: "",
    place: {
      dcid: "geoId/06",
      name: "California",
      place_type: "State",
    },
    placeFallback: {},
    placeSource: "CURRENT_QUERY",
    places: [
      {
        dcid: "geoId/06",
        name: "California",
        place_type: "State",
      },
    ],
    svSource: "CURRENT_QUERY",
    userMessages: [],
  },
};

export const OBESITY_POINT_WITHIN_RESP = {
  data: {
    data: {
      Percent_Person_Obesity: {
        "geoId/06001": {
          date: "2021",
          facet: "2329020768",
          value: 24.8,
        },
        "geoId/06003": {
          date: "2021",
          facet: "2329020768",
          value: 29.1,
        },
        "geoId/06005": {
          date: "2021",
          facet: "2329020768",
          value: 29.6,
        },
        "geoId/06007": {
          date: "2021",
          facet: "2329020768",
          value: 31,
        },
        "geoId/06009": {
          date: "2021",
          facet: "2329020768",
          value: 30.6,
        },
        "geoId/06011": {
          date: "2021",
          facet: "2329020768",
          value: 33.4,
        },
        "geoId/06013": {
          date: "2021",
          facet: "2329020768",
          value: 24.3,
        },
        "geoId/06015": {
          date: "2021",
          facet: "2329020768",
          value: 32.7,
        },
        "geoId/06017": {
          date: "2021",
          facet: "2329020768",
          value: 28.1,
        },
        "geoId/06019": {
          date: "2021",
          facet: "2329020768",
          value: 36.8,
        },
        "geoId/06021": {
          date: "2021",
          facet: "2329020768",
          value: 31.8,
        },
        "geoId/06023": {
          date: "2021",
          facet: "2329020768",
          value: 33.2,
        },
        "geoId/06025": {
          date: "2021",
          facet: "2329020768",
          value: 38,
        },
        "geoId/06027": {
          date: "2021",
          facet: "2329020768",
          value: 29.4,
        },
        "geoId/06029": {
          date: "2021",
          facet: "2329020768",
          value: 36.6,
        },
        "geoId/06031": {
          date: "2021",
          facet: "2329020768",
          value: 35.1,
        },
        "geoId/06033": {
          date: "2021",
          facet: "2329020768",
          value: 33.7,
        },
        "geoId/06035": {
          date: "2021",
          facet: "2329020768",
          value: 32.1,
        },
        "geoId/06037": {
          date: "2021",
          facet: "2329020768",
          value: 28.5,
        },
        "geoId/06039": {
          date: "2021",
          facet: "2329020768",
          value: 35.9,
        },
        "geoId/06041": {
          date: "2021",
          facet: "2329020768",
          value: 22.9,
        },
        "geoId/06043": {
          date: "2021",
          facet: "2329020768",
          value: 30,
        },
        "geoId/06045": {
          date: "2021",
          facet: "2329020768",
          value: 31.5,
        },
        "geoId/06047": {
          date: "2021",
          facet: "2329020768",
          value: 33,
        },
        "geoId/06049": {
          date: "2021",
          facet: "2329020768",
          value: 33.1,
        },
        "geoId/06051": {
          date: "2021",
          facet: "2329020768",
          value: 29.6,
        },
        "geoId/06053": {
          date: "2021",
          facet: "2329020768",
          value: 27.5,
        },
        "geoId/06055": {
          date: "2021",
          facet: "2329020768",
          value: 28,
        },
        "geoId/06057": {
          date: "2021",
          facet: "2329020768",
          value: 27.5,
        },
        "geoId/06059": {
          date: "2021",
          facet: "2329020768",
          value: 25.3,
        },
        "geoId/06061": {
          date: "2021",
          facet: "2329020768",
          value: 26.3,
        },
        "geoId/06063": {
          date: "2021",
          facet: "2329020768",
          value: 29.5,
        },
        "geoId/06065": {
          date: "2021",
          facet: "2329020768",
          value: 36.2,
        },
        "geoId/06067": {
          date: "2021",
          facet: "2329020768",
          value: 31.7,
        },
        "geoId/06069": {
          date: "2021",
          facet: "2329020768",
          value: 31,
        },
        "geoId/06071": {
          date: "2021",
          facet: "2329020768",
          value: 38.1,
        },
        "geoId/06073": {
          date: "2021",
          facet: "2329020768",
          value: 23.9,
        },
        "geoId/06075": {
          date: "2021",
          facet: "2329020768",
          value: 18.7,
        },
        "geoId/06077": {
          date: "2021",
          facet: "2329020768",
          value: 33.3,
        },
        "geoId/06079": {
          date: "2021",
          facet: "2329020768",
          value: 30.5,
        },
        "geoId/06081": {
          date: "2021",
          facet: "2329020768",
          value: 21,
        },
        "geoId/06083": {
          date: "2021",
          facet: "2329020768",
          value: 30.1,
        },
        "geoId/06085": {
          date: "2021",
          facet: "2329020768",
          value: 18.5,
        },
        "geoId/06087": {
          date: "2021",
          facet: "2329020768",
          value: 25.2,
        },
        "geoId/06089": {
          date: "2021",
          facet: "2329020768",
          value: 30.9,
        },
        "geoId/06091": {
          date: "2021",
          facet: "2329020768",
          value: 29.8,
        },
        "geoId/06093": {
          date: "2021",
          facet: "2329020768",
          value: 32.8,
        },
        "geoId/06095": {
          date: "2021",
          facet: "2329020768",
          value: 29.9,
        },
        "geoId/06097": {
          date: "2021",
          facet: "2329020768",
          value: 28.6,
        },
        "geoId/06099": {
          date: "2021",
          facet: "2329020768",
          value: 34.8,
        },
        "geoId/06101": {
          date: "2021",
          facet: "2329020768",
          value: 31.6,
        },
        "geoId/06103": {
          date: "2021",
          facet: "2329020768",
          value: 34.2,
        },
        "geoId/06105": {
          date: "2021",
          facet: "2329020768",
          value: 33,
        },
        "geoId/06107": {
          date: "2021",
          facet: "2329020768",
          value: 35.5,
        },
        "geoId/06109": {
          date: "2021",
          facet: "2329020768",
          value: 29.5,
        },
        "geoId/06111": {
          date: "2021",
          facet: "2329020768",
          value: 27,
        },
        "geoId/06113": {
          date: "2021",
          facet: "2329020768",
          value: 27.8,
        },
        "geoId/06115": {
          date: "2021",
          facet: "2329020768",
          value: 33.9,
        },
      },
    },
    facets: {
      "2329020768": {
        importName: "CDC500",
        measurementMethod: "AgeAdjustedPrevalence",
        observationPeriod: "P1Y",
        provenanceUrl: "https://www.cdc.gov/places/index.html",
      },
    },
  },
};

export const POVERTY_POINT_WITHIN_RESP = {
  data: {
    data: {
      Count_Person_BelowPovertyLevelInThePast12Months: {
        "geoId/06001": {
          date: "2022",
          facet: "1145703171",
          value: 149843,
        },
        "geoId/06003": {
          date: "2022",
          facet: "1145703171",
          value: 208,
        },
        "geoId/06005": {
          date: "2022",
          facet: "1145703171",
          value: 2945,
        },
        "geoId/06007": {
          date: "2022",
          facet: "1145703171",
          value: 38015,
        },
        "geoId/06009": {
          date: "2022",
          facet: "1145703171",
          value: 5915,
        },
        "geoId/06011": {
          date: "2022",
          facet: "1145703171",
          value: 2364,
        },
        "geoId/06013": {
          date: "2022",
          facet: "1145703171",
          value: 95255,
        },
        "geoId/06015": {
          date: "2022",
          facet: "1145703171",
          value: 3585,
        },
        "geoId/06017": {
          date: "2022",
          facet: "1145703171",
          value: 16364,
        },
        "geoId/06019": {
          date: "2022",
          facet: "1145703171",
          value: 193675,
        },
        "geoId/06021": {
          date: "2022",
          facet: "1145703171",
          value: 4335,
        },
        "geoId/06023": {
          date: "2022",
          facet: "1145703171",
          value: 26394,
        },
        "geoId/06025": {
          date: "2022",
          facet: "1145703171",
          value: 36092,
        },
        "geoId/06027": {
          date: "2022",
          facet: "1145703171",
          value: 2199,
        },
        "geoId/06029": {
          date: "2022",
          facet: "1145703171",
          value: 170013,
        },
        "geoId/06031": {
          date: "2022",
          facet: "1145703171",
          value: 22634,
        },
        "geoId/06033": {
          date: "2022",
          facet: "1145703171",
          value: 11065,
        },
        "geoId/06035": {
          date: "2022",
          facet: "1145703171",
          value: 3645,
        },
        "geoId/06037": {
          date: "2022",
          facet: "1145703171",
          value: 1343978,
        },
        "geoId/06039": {
          date: "2022",
          facet: "1145703171",
          value: 30154,
        },
        "geoId/06041": {
          date: "2022",
          facet: "1145703171",
          value: 17809,
        },
        "geoId/06043": {
          date: "2022",
          facet: "1145703171",
          value: 2712,
        },
        "geoId/06045": {
          date: "2022",
          facet: "1145703171",
          value: 14483,
        },
        "geoId/06047": {
          date: "2022",
          facet: "1145703171",
          value: 51272,
        },
        "geoId/06049": {
          date: "2022",
          facet: "1145703171",
          value: 1430,
        },
        "geoId/06051": {
          date: "2022",
          facet: "1145703171",
          value: 1478,
        },
        "geoId/06053": {
          date: "2022",
          facet: "1145703171",
          value: 51913,
        },
        "geoId/06055": {
          date: "2022",
          facet: "1145703171",
          value: 10620,
        },
        "geoId/06057": {
          date: "2022",
          facet: "1145703171",
          value: 10505,
        },
        "geoId/06059": {
          date: "2022",
          facet: "1145703171",
          value: 303810,
        },
        "geoId/06061": {
          date: "2022",
          facet: "1145703171",
          value: 27446,
        },
        "geoId/06063": {
          date: "2022",
          facet: "1145703171",
          value: 2101,
        },
        "geoId/06065": {
          date: "2022",
          facet: "1145703171",
          value: 272432,
        },
        "geoId/06067": {
          date: "2022",
          facet: "1145703171",
          value: 204388,
        },
        "geoId/06069": {
          date: "2022",
          facet: "1145703171",
          value: 4832,
        },
        "geoId/06071": {
          date: "2022",
          facet: "1145703171",
          value: 294246,
        },
        "geoId/06073": {
          date: "2022",
          facet: "1145703171",
          value: 338752,
        },
        "geoId/06075": {
          date: "2022",
          facet: "1145703171",
          value: 87849,
        },
        "geoId/06077": {
          date: "2022",
          facet: "1145703171",
          value: 98352,
        },
        "geoId/06079": {
          date: "2022",
          facet: "1145703171",
          value: 33728,
        },
        "geoId/06081": {
          date: "2022",
          facet: "1145703171",
          value: 48137,
        },
        "geoId/06083": {
          date: "2022",
          facet: "1145703171",
          value: 57513,
        },
        "geoId/06085": {
          date: "2022",
          facet: "1145703171",
          value: 129834,
        },
        "geoId/06087": {
          date: "2022",
          facet: "1145703171",
          value: 29302,
        },
        "geoId/06089": {
          date: "2022",
          facet: "1145703171",
          value: 23753,
        },
        "geoId/06091": {
          date: "2022",
          facet: "1145703171",
          value: 359,
        },
        "geoId/06093": {
          date: "2022",
          facet: "1145703171",
          value: 7289,
        },
        "geoId/06095": {
          date: "2022",
          facet: "1145703171",
          value: 39705,
        },
        "geoId/06097": {
          date: "2022",
          facet: "1145703171",
          value: 42925,
        },
        "geoId/06099": {
          date: "2022",
          facet: "1145703171",
          value: 75125,
        },
        "geoId/06101": {
          date: "2022",
          facet: "1145703171",
          value: 13065,
        },
        "geoId/06103": {
          date: "2022",
          facet: "1145703171",
          value: 10483,
        },
        "geoId/06105": {
          date: "2022",
          facet: "1145703171",
          value: 3457,
        },
        "geoId/06107": {
          date: "2022",
          facet: "1145703171",
          value: 86391,
        },
        "geoId/06109": {
          date: "2022",
          facet: "1145703171",
          value: 5887,
        },
        "geoId/06111": {
          date: "2022",
          facet: "1145703171",
          value: 74315,
        },
        "geoId/06113": {
          date: "2022",
          facet: "1145703171",
          value: 36521,
        },
        "geoId/06115": {
          date: "2022",
          facet: "1145703171",
          value: 12375,
        },
      },
    },
    facets: {
      "1145703171": {
        importName: "CensusACS5YearSurvey",
        measurementMethod: "CensusACS5yrSurvey",
        provenanceUrl:
          "https://www.census.gov/programs-surveys/acs/data/data-via-ftp.html",
      },
    },
  },
};

export const CALIFORNIA_COUNTY_NAMES = {
  data: {
    "geoId/06001": "Alameda County, CA",
    "geoId/06003": "Alpine County, CA",
    "geoId/06005": "Amador County, CA",
    "geoId/06007": "Butte County, CA",
    "geoId/06009": "Calaveras County, CA",
    "geoId/06011": "Colusa County, CA",
    "geoId/06013": "Contra Costa County, CA",
    "geoId/06015": "Del Norte County, CA",
    "geoId/06017": "El Dorado County, CA",
    "geoId/06019": "Fresno County, CA",
    "geoId/06021": "Glenn County, CA",
    "geoId/06023": "Humboldt County, CA",
    "geoId/06025": "Imperial County, CA",
    "geoId/06027": "Inyo County, CA",
    "geoId/06029": "Kern County, CA",
    "geoId/06031": "Kings County, CA",
    "geoId/06033": "Lake County, CA",
    "geoId/06035": "Lassen County, CA",
    "geoId/06037": "Los Angeles County, CA",
    "geoId/06039": "Madera County, CA",
    "geoId/06041": "Marin County, CA",
    "geoId/06043": "Mariposa County, CA",
    "geoId/06045": "Mendocino County, CA",
    "geoId/06047": "Merced County, CA",
    "geoId/06049": "Modoc County, CA",
    "geoId/06051": "Mono County, CA",
    "geoId/06053": "Monterey County, CA",
    "geoId/06055": "Napa County, CA",
    "geoId/06057": "Nevada County, CA",
    "geoId/06059": "Orange County, CA",
    "geoId/06061": "Placer County, CA",
    "geoId/06063": "Plumas County, CA",
    "geoId/06065": "Riverside County, CA",
    "geoId/06067": "Sacramento County, CA",
    "geoId/06069": "San Benito County, CA",
    "geoId/06071": "San Bernardino County, CA",
    "geoId/06073": "San Diego County, CA",
    "geoId/06075": "San Francisco County, CA",
    "geoId/06077": "San Joaquin County, CA",
    "geoId/06079": "San Luis Obispo County, CA",
    "geoId/06081": "San Mateo County, CA",
    "geoId/06083": "Santa Barbara County, CA",
    "geoId/06085": "Santa Clara County, CA",
    "geoId/06087": "Santa Cruz County, CA",
    "geoId/06089": "Shasta County, CA",
    "geoId/06091": "Sierra County, CA",
    "geoId/06093": "Siskiyou County, CA",
    "geoId/06095": "Solano County, CA",
    "geoId/06097": "Sonoma County, CA",
    "geoId/06099": "Stanislaus County, CA",
    "geoId/06101": "Sutter County, CA",
    "geoId/06103": "Tehama County, CA",
    "geoId/06105": "Trinity County, CA",
    "geoId/06107": "Tulare County, CA",
    "geoId/06109": "Tuolumne County, CA",
    "geoId/06111": "Ventura County, CA",
    "geoId/06113": "Yolo County, CA",
    "geoId/06115": "Yuba County, CA",
  },
};
