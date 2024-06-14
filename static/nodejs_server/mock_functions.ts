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

/* mocked axios calls for nodejs server tests. */

jest.mock("axios");
import axios from "axios";
import { when } from "jest-when";

import { stringifyFn } from "../js/utils/axios";
import {
  BAR_FILTER_POINTS_RESP,
  BAR_NL_RESP,
  BAR_POINTS_RESP,
  CALIFORNIA_COUNTY_NAMES,
  HOUSEHOLD_INCOME_LATEST_POINTS_RESP,
  MEAN_HOUSEHOLD_INCOME_SERIES_RESP,
  MEDIAN_HOUSEHOLD_INCOME_SERIES_RESP,
  NORTH_DAKOTA_COUNTY_NAMES_RESP,
  NORTH_DAKOTA_NAME_RESP,
  OBESITY_POINT_WITHIN_RESP,
  POVERTY_POINT_WITHIN_RESP,
  SANTA_CLARA_NAME_RESP,
  SCATTER_NL_RESP,
  TIMELINE_NL_RESP,
} from "./mock_data";

export function queryAxiosMock(): void {
  // Mock all the async axios call.
  axios.get = jest.fn();
  axios.post = jest.fn();

  /**
   * Timeline test mocks
   */

  when(axios.post)
    .calledWith(
      "/api/explore/detect-and-fulfill?q=family earnings in north dakota&detector=heuristic&client=bard&mode=strict&skipRelatedThings=true",
      {}
    )
    .mockResolvedValue(TIMELINE_NL_RESP);
  when(axios.get)
    .calledWith("/api/observations/point/within", {
      params: {
        childType: "County",
        date: "",
        facetIds: [],
        parentEntity: "geoId/38",
        variables: ["Mean_Income_Household_FamilyHousehold"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue(HOUSEHOLD_INCOME_LATEST_POINTS_RESP);
  when(axios.post)
    .calledWith("/api/observations/series", {
      entities: ["geoId/38"],
      variables: ["Mean_Income_Household_FamilyHousehold"],
    })
    .mockResolvedValue(MEAN_HOUSEHOLD_INCOME_SERIES_RESP);
  when(axios.post)
    .calledWith("/api/observations/series", {
      entities: ["geoId/38"],
      variables: ["Median_Income_Household_FamilyHousehold"],
    })
    .mockResolvedValue(MEDIAN_HOUSEHOLD_INCOME_SERIES_RESP);
  when(axios.post)
    .calledWith("/api/place/name", { dcids: ["geoId/38"], prop: undefined }, {})
    .mockResolvedValue(NORTH_DAKOTA_NAME_RESP);
  when(axios.post)
    .calledWith(
      "/api/place/name",
      {
        dcids: [
          "geoId/38001",
          "geoId/38003",
          "geoId/38005",
          "geoId/38007",
          "geoId/38009",
          "geoId/38011",
          "geoId/38013",
          "geoId/38015",
          "geoId/38017",
          "geoId/38019",
          "geoId/38021",
          "geoId/38023",
          "geoId/38025",
          "geoId/38027",
          "geoId/38029",
          "geoId/38031",
          "geoId/38033",
          "geoId/38035",
          "geoId/38037",
          "geoId/38039",
          "geoId/38041",
          "geoId/38043",
          "geoId/38045",
          "geoId/38047",
          "geoId/38049",
          "geoId/38051",
          "geoId/38053",
          "geoId/38055",
          "geoId/38057",
          "geoId/38059",
          "geoId/38061",
          "geoId/38063",
          "geoId/38065",
          "geoId/38067",
          "geoId/38069",
          "geoId/38071",
          "geoId/38073",
          "geoId/38075",
          "geoId/38077",
          "geoId/38079",
          "geoId/38081",
          "geoId/38083",
          "geoId/38085",
          "geoId/38087",
          "geoId/38089",
          "geoId/38091",
          "geoId/38093",
          "geoId/38095",
          "geoId/38097",
          "geoId/38099",
          "geoId/38101",
          "geoId/38103",
          "geoId/38105",
        ],
        prop: undefined,
      },
      {}
    )
    .mockResolvedValue(NORTH_DAKOTA_COUNTY_NAMES_RESP);

  /**
   * bar test mocks
   */
  when(axios.post)
    .calledWith(
      "/api/explore/detect-and-fulfill?q=top jobs in santa clara county&detector=heuristic&client=bard&mode=strict&skipRelatedThings=true",
      {}
    )
    .mockResolvedValue(BAR_NL_RESP);
  when(axios.get)
    .calledWith("/api/observations/point", {
      params: {
        date: "",
        entities: ["geoId/06085"],
        variables: [
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
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue(BAR_POINTS_RESP);
  when(axios.get)
    .calledWith("/api/observations/point", {
      params: {
        date: "",
        entities: ["geoId/06085"],
        variables: ["Count_Person"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue(BAR_FILTER_POINTS_RESP);
  when(axios.post)
    .calledWith(
      "/api/place/name",
      { dcids: ["geoId/06085"], prop: undefined },
      {}
    )
    .mockResolvedValue(SANTA_CLARA_NAME_RESP);

  /**
   * scatter test mocks
   */
  when(axios.post)
    .calledWith(
      "/api/explore/detect-and-fulfill?q=obesity vs. poverty in counties of california&detector=heuristic&client=bard&mode=strict&skipRelatedThings=true",
      {}
    )
    .mockResolvedValue(SCATTER_NL_RESP);
  when(axios.get)
    .calledWith("/api/observations/point/within", {
      params: {
        childType: "County",
        date: "",
        parentEntity: "geoId/06",
        variables: ["Percent_Person_Obesity"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue(OBESITY_POINT_WITHIN_RESP);
  when(axios.get)
    .calledWith("/api/observations/point/within", {
      params: {
        childType: "County",
        date: "",
        parentEntity: "geoId/06",
        variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue(POVERTY_POINT_WITHIN_RESP);
  when(axios.get)
    .calledWith("/api/place/descendent/name", {
      params: { dcid: "geoId/06", descendentType: "County" },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue(CALIFORNIA_COUNTY_NAMES);
}
