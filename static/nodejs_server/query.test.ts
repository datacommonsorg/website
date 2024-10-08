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

/* Tests for getting result for query endpoint */

import { queryAxiosMock } from "./mock_functions";
import { getQueryResult } from "./query";
import { TileResult } from "./types";

jest.mock("axios");
jest.setTimeout(100000);

const TIMELINE_EXPECTED_RESULT = [
  {
    chartUrl:
      "/nodejs/chart?&props=eJyNj00LwjAMQP9KyXngwYvsJn7gQIegeBEZoctmsWtG2w3G2H%252B3ozCvHh95jyQjkJGaHZVXjZLuQ0uQAiRAPRk%252F460lCanptE6gnZ0wr4mzcrXeBM959A%252B00XqOYLCZjW1PFmsSmZHckKjYiiM2Sg%252FixJ2jN%252BvS%252FeoQXAhNEe1iUYrYLAzTKwGvNO3YVKqGdAzk9b8LhTIiZ%252BvfYo8f9hgO8PHhc5YfYJq%252BuQheGw%253D%253D",
    data_csv:
      "label,Average Income for Family Households\r\n2019,105819\r\n2018,103731\r\n2017,99878\r\n2016,96309\r\n2015,93044\r\n2014,90140\r\n2013,86449\r\n2012,83141\r\n2011,79594\r\n2010,75645",
    dcUrl:
      "https://datacommons.org/explore#q=family%20earnings%20in%20north%20dakota",
    highlight: {
      date: "2019",
      value: 105819,
    },
    legend: ["Average Income for Family Households"],
    places: ["geoId/38"],
    srcs: [
      {
        name: "data.census.gov",
        url: "https://data.census.gov/cedsci/table?q=S1901&tid=ACSST5Y2019.S1901",
      },
    ],
    title: "Average Income for Family Households in North Dakota",
    type: "LINE",
    unit: "Infl. adj. USD (CY)",
    vars: ["Mean_Income_Household_FamilyHousehold"],
  },
  {
    data_csv:
      "rank,place,Average Income for Family Households\r\n1,geoId/38105,126095\r\n2,geoId/38025,122699\r\n3,geoId/38023,118649\r\n4,geoId/38061,118316\r\n5,geoId/38053,117604\r\n49,geoId/38069,76245\r\n50,geoId/38051,75949\r\n51,geoId/38079,72908\r\n52,geoId/38005,69206\r\n53,geoId/38085,56872",
    dcUrl:
      "https://datacommons.org/explore#q=family%20earnings%20in%20north%20dakota",
    placeType: "County",
    places: ["geoId/38"],
    srcs: [
      {
        name: "data.census.gov",
        url: "https://data.census.gov/cedsci/table?q=S1901&tid=ACSST5Y2019.S1901",
      },
    ],
    title:
      "Average Income for Family Households in Counties of North Dakota (2019)",
    type: "TABLE",
    unit: "Infl. adj. USD (CY)",
    vars: ["Mean_Income_Household_FamilyHousehold"],
  },
  {
    chartUrl:
      "/nodejs/chart?&props=eJyFz80KwjAQBOBXCXsuePAivfqDBS2C4kWkhGStwW22tFuhlL67KYFcPQ77DcNOgN4Q92gvpA3exhYhB8gAv%252BhlidcWDeR%252BIMqgXUy418iFXa03wfWi5a67qB4TeN0s4ozWaa8OunE0qiMPPb6ZrCq84QBSL9EqXqpEq9hNGeZnBuIIt%252BxfroZ8Ckno%252F5hyXpXcyVvt9IdFh3GJb56Kcg%252Fz%252FAMIDFpa",
    data_csv:
      "label,Median Family Household Income\r\n2019,86249\r\n2018,83272\r\n2017,80091\r\n2016,77277\r\n2015,74708\r\n2014,72770\r\n2013,70767\r\n2012,68293\r\n2011,65871\r\n2010,62920",
    dcUrl:
      "https://datacommons.org/explore#q=family%20earnings%20in%20north%20dakota",
    highlight: {
      date: "2019",
      value: 86249,
    },
    legend: ["Median Family Household Income"],
    places: ["geoId/38"],
    srcs: [
      {
        name: "data.census.gov",
        url: "https://data.census.gov/cedsci/table?q=S1901&tid=ACSST5Y2019.S1901",
      },
    ],
    title: "Median Family Household Income in North Dakota",
    type: "LINE",
    unit: "Infl. adj. USD (CY)",
    vars: ["Median_Income_Household_FamilyHousehold"],
  },
];

const BAR_EXPECTED_RESULT = [
  {
    chartUrl:
      "/nodejs/chart?&props=eJyVlW1v2jAQx7%252BKZe1FJ0WindQHeMcQXZm2tSNsvKimyjiXxKqxI9upQIjvvnMMxLSohTcoWPf%252F3fkefCsKikttIXuQjMNkWQHt0YFwS5pQeAHl%252FFFaAac9VUuZ0MrboU0BepR1zq%252FOby7R1Drm%252FjITDB9XVLG5N%252Bpzruc6Y05o1bnVOiMjldXWmWWr8f50rdzTVJtnME%252B%252F%252BqNB2gi3Si9MwbwIDpauk5aezYUiHTJl1gH5yRQrYI4hk43x0c48R6AhenuBtK4qbVwDbZlj%252FM1EE87BUAojeC1dbSAht9qAd4tfwpZCFQm5Q5%252F48VEgLWXL2BC2%252BsjlQCs0qLkP6dibxpqYNcxq3tyNyW3y7LHMSHsoM3fApCvJgBkgTGUk1Vygl761mHGmjq9SAHlOQLSE2B1WrM4ZxxS%252BTnfGOyorLhbPF9DNDf8Sq26FakLxAY6Urc0pgW3EO10MHqlcmzk7pUaRZK%252FDjLMJGSoHxjGhfE8mZAzcwEl0j9mDtIi9NOJA%252BL79XTNjls3nvZBNfr4xS4YLHJaTOi8AdziEIafFxL7vXQmmbcMzWHCoHHmoZ1Jw0gzr5w%252B8NYhD3TjBClk%252F3iFpfbzPFDuq1LU90C83VfdaXcvulSyKmxjzxwkpnED2%252B3G0dpF4DJh7STCUDF57rK66rrIyy7vd8npfhEMz9LahS8dYOhYK8gPYm%252BDfhuIBQR%252BkW1XkI87w5jnEyryPDZpXkog5LbUEyyQcuO9b2s46GMexGZ0DTrx%252FZhKScoGXELngSZOCCfBSCR69Xh%252BFHeFa2A7Tts6%252FhGINAR%252FOXBS0t6IzZiZ4EDbdis7ZotmclvYuLhP%252FF10KNpPhZJ1QXGQVHlmttoaPe8uz8eBk86RjdQptsF%252BIzsl3PbMEF1zKsF5kIJnBX3%252BTJTn7tMLVCGs%252FBy7s7K%252F9MV2v%252FwNq8cXq",
    data_csv:
      'label,Santa Clara County\r\nAccomodation/Food Industry,82881\r\nAdmin / Waste Management Service Industry,60538\r\n"Agriculture, Forestry, Fishing, Hunting",2960\r\nConstruction Industry,53031\r\nEducational Services Industry,81663\r\nHealth Care and Social Assistance Industry,156124\r\nManufacturing,176811\r\nFinance and Insurance Industry,20831\r\nInformation Industry,96168\r\n"Arts, Entertainment, Recreation Industry",20764\r\n"Mining, Quarrying, Oil and Gas Extraction Industry",142\r\nOther Services (except Public Admin),25214\r\nTransportation And Warehousing,20846\r\nUtilities,3527\r\nRetail Trade,72215\r\nReal Estate and Rental and Leasing,15648\r\nPublic Administration,27668\r\nWholesale Trade,28183\r\n"Professional, Scientific, and Technical Services",161223',
    dcUrl:
      "https://datacommons.org/explore#q=top%20jobs%20in%20santa%20clara%20county",
    legend: [
      "Accomodation/Food Industry",
      "Admin / Waste Management Service Industry",
      "Agriculture, Forestry, Fishing, Hunting",
      "Construction Industry",
      "Educational Services Industry",
      "Health Care and Social Assistance Industry",
      "Manufacturing",
      "Finance and Insurance Industry",
      "Information Industry",
      "Arts, Entertainment, Recreation Industry",
      "Mining, Quarrying, Oil and Gas Extraction Industry",
      "Other Services (except Public Admin)",
      "Transportation And Warehousing",
      "Utilities",
      "Retail Trade",
      "Real Estate and Rental and Leasing",
      "Public Administration",
      "Wholesale Trade",
      "Professional, Scientific, and Technical Services",
    ],
    placeType: "City",
    places: ["geoId/06085"],
    srcs: [
      {
        name: "bls.gov",
        url: "https://www.bls.gov/qcew/",
      },
    ],
    title: "Categories of Jobs in Santa Clara County (Jun, 2023)",
    type: "BAR",
    unit: "",
    vars: [
      "Count_Worker_NAICSAccommodationFoodServices",
      "Count_Worker_NAICSAdministrativeSupportWasteManagementRemediationServices",
      "Count_Worker_NAICSAgricultureForestryFishingHunting",
      "Count_Worker_NAICSConstruction",
      "Count_Worker_NAICSEducationalServices",
      "Count_Worker_NAICSHealthCareSocialAssistance",
      "dc/ndg1xk1e9frc2",
      "Count_Worker_NAICSFinanceInsurance",
      "Count_Worker_NAICSInformation",
      "Count_Worker_NAICSArtsEntertainmentRecreation",
      "Count_Worker_NAICSMiningQuarryingOilGasExtraction",
      "Count_Worker_NAICSOtherServices",
      "dc/8p97n7l96lgg8",
      "Count_Worker_NAICSUtilities",
      "dc/p69tpsldf99h7",
      "Count_Worker_NAICSRealEstateRentalLeasing",
      "Count_Worker_NAICSPublicAdministration",
      "Count_Worker_NAICSWholesaleTrade",
      "Count_Worker_NAICSProfessionalScientificTechnicalServices",
    ],
  },
];

const SCATTER_EXPECTED_RESULT = [
  {
    chartUrl:
      "/nodejs/chart?&props=eJx1kU1LxDAQhv9KGBQUil8HD71p9bCwYtktexFZYnd2G4gzIZmultL%252FbtKuriAewkDyzDt5kh6QassBN6XVNVadQ8ih4JakgwxwjyRpc%252BmwhpxaazNwiYzUDnm2uby6jVwQLSvtJ%252BqlB9LviSg97rWNE1DxVj2%252FYTBjLHGJvtDOiIZcfIs%252FCakJfR2nrmMNTOtjV0tG4vkpDNlxArvWajFM6h4tfyjHe%252FTSKWsI4Xfs6PQdOrLlhM6jpJ1R1WCpg1zfPDFJE2B4zUCMxYJpa3aQ9xBqLYK%252BipuTaA%252BN2TU2LqnYLVKddIbUKvbfJ1BnJ333oAWHc7UKF%252BqPxeFqah4tEvx5gA2p0cNgSHGFtmbLnoyOqjL93bK4q6rHBQzDFwjZp4s%253D",
    data_csv:
      'placeName,placeDcid,xDate,xValue-Count_Person_BelowPovertyLevelInThePast12Months,yDate,yValue-Percent_Person_Obesity\r\n"Alameda County, CA",geoId/06001,2022,149843,2021,24.8\r\n"Alpine County, CA",geoId/06003,2022,208,2021,29.1\r\n"Amador County, CA",geoId/06005,2022,2945,2021,29.6\r\n"Butte County, CA",geoId/06007,2022,38015,2021,31\r\n"Calaveras County, CA",geoId/06009,2022,5915,2021,30.6\r\n"Colusa County, CA",geoId/06011,2022,2364,2021,33.4\r\n"Contra Costa County, CA",geoId/06013,2022,95255,2021,24.3\r\n"Del Norte County, CA",geoId/06015,2022,3585,2021,32.7\r\n"El Dorado County, CA",geoId/06017,2022,16364,2021,28.1\r\n"Fresno County, CA",geoId/06019,2022,193675,2021,36.8\r\n"Glenn County, CA",geoId/06021,2022,4335,2021,31.8\r\n"Humboldt County, CA",geoId/06023,2022,26394,2021,33.2\r\n"Imperial County, CA",geoId/06025,2022,36092,2021,38\r\n"Inyo County, CA",geoId/06027,2022,2199,2021,29.4\r\n"Kern County, CA",geoId/06029,2022,170013,2021,36.6\r\n"Kings County, CA",geoId/06031,2022,22634,2021,35.1\r\n"Lake County, CA",geoId/06033,2022,11065,2021,33.7\r\n"Lassen County, CA",geoId/06035,2022,3645,2021,32.1\r\n"Los Angeles County, CA",geoId/06037,2022,1343978,2021,28.5\r\n"Madera County, CA",geoId/06039,2022,30154,2021,35.9\r\n"Marin County, CA",geoId/06041,2022,17809,2021,22.9\r\n"Mariposa County, CA",geoId/06043,2022,2712,2021,30\r\n"Mendocino County, CA",geoId/06045,2022,14483,2021,31.5\r\n"Merced County, CA",geoId/06047,2022,51272,2021,33\r\n"Modoc County, CA",geoId/06049,2022,1430,2021,33.1\r\n"Mono County, CA",geoId/06051,2022,1478,2021,29.6\r\n"Monterey County, CA",geoId/06053,2022,51913,2021,27.5\r\n"Napa County, CA",geoId/06055,2022,10620,2021,28\r\n"Nevada County, CA",geoId/06057,2022,10505,2021,27.5\r\n"Orange County, CA",geoId/06059,2022,303810,2021,25.3\r\n"Placer County, CA",geoId/06061,2022,27446,2021,26.3\r\n"Plumas County, CA",geoId/06063,2022,2101,2021,29.5\r\n"Riverside County, CA",geoId/06065,2022,272432,2021,36.2\r\n"Sacramento County, CA",geoId/06067,2022,204388,2021,31.7\r\n"San Benito County, CA",geoId/06069,2022,4832,2021,31\r\n"San Bernardino County, CA",geoId/06071,2022,294246,2021,38.1\r\n"San Diego County, CA",geoId/06073,2022,338752,2021,23.9\r\n"San Francisco County, CA",geoId/06075,2022,87849,2021,18.7\r\n"San Joaquin County, CA",geoId/06077,2022,98352,2021,33.3\r\n"San Luis Obispo County, CA",geoId/06079,2022,33728,2021,30.5\r\n"San Mateo County, CA",geoId/06081,2022,48137,2021,21\r\n"Santa Barbara County, CA",geoId/06083,2022,57513,2021,30.1\r\n"Santa Clara County, CA",geoId/06085,2022,129834,2021,18.5\r\n"Santa Cruz County, CA",geoId/06087,2022,29302,2021,25.2\r\n"Shasta County, CA",geoId/06089,2022,23753,2021,30.9\r\n"Sierra County, CA",geoId/06091,2022,359,2021,29.8\r\n"Siskiyou County, CA",geoId/06093,2022,7289,2021,32.8\r\n"Solano County, CA",geoId/06095,2022,39705,2021,29.9\r\n"Sonoma County, CA",geoId/06097,2022,42925,2021,28.6\r\n"Stanislaus County, CA",geoId/06099,2022,75125,2021,34.8\r\n"Sutter County, CA",geoId/06101,2022,13065,2021,31.6\r\n"Tehama County, CA",geoId/06103,2022,10483,2021,34.2\r\n"Trinity County, CA",geoId/06105,2022,3457,2021,33\r\n"Tulare County, CA",geoId/06107,2022,86391,2021,35.5\r\n"Tuolumne County, CA",geoId/06109,2022,5887,2021,29.5\r\n"Ventura County, CA",geoId/06111,2022,74315,2021,27\r\n"Yolo County, CA",geoId/06113,2022,36521,2021,27.8\r\n"Yuba County, CA",geoId/06115,2022,12375,2021,33.9',
    dcUrl:
      "https://datacommons.org/explore#q=obesity%20vs.%20poverty%20in%20counties%20of%20california",
    placeType: "County",
    places: ["geoId/06"],
    srcs: [
      {
        name: "census.gov",
        url: "https://www.census.gov/programs-surveys/acs/data/data-via-ftp.html",
      },
      {
        name: "cdc.gov",
        url: "https://www.cdc.gov/places/index.html",
      },
    ],
    title:
      "Prevalence of Obesity (2021) Vs. Population Below Poverty Line (2022) in Counties of California",
    type: "SCATTER",
    vars: [
      "Percent_Person_Obesity",
      "Count_Person_BelowPovertyLevelInThePast12Months",
    ],
  },
];

test("getQueryResult", async () => {
  const cases: {
    expectedCharts: TileResult[];
    query: string;
  }[] = [
    {
      expectedCharts: TIMELINE_EXPECTED_RESULT,
      query: "family earnings in north dakota",
    },
    {
      expectedCharts: BAR_EXPECTED_RESULT,
      query: "top jobs in santa clara county",
    },
    {
      expectedCharts: SCATTER_EXPECTED_RESULT,
      query: "obesity vs. poverty in counties of california",
    },
  ];

  // Mock data fetches
  queryAxiosMock();

  for (const c of cases) {
    const result = await getQueryResult(
      c.query,
      true,
      false,
      "",
      "",
      "",
      "bard",
      "",
      "",
      false
    );
    try {
      expect(result.charts).toStrictEqual(c.expectedCharts);
    } catch (e) {
      console.log(`Failed for query: ${c.query}`);
      throw e;
    }
  }
});
