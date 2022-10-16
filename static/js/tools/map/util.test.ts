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

import { ContextType } from "./context";
import {
  applyHashDisplay,
  applyHashPlaceInfo,
  applyHashStatVar,
  getTimeSliderDates,
  updateHashDisplay,
  updateHashPlaceInfo,
  updateHashStatVar,
} from "./util";

const TestContext = {
  placeInfo: {
    value: {
      selectedPlace: {
        dcid: "geoId/10",
        name: "Delaware",
        types: ["State"],
      },
      enclosingPlace: {
        dcid: "",
        name: "",
      },
      enclosedPlaceType: "County",
      mapPointPlaceType: "",
    },
  },
  statVar: {
    value: {
      dcid: "Count_Person",
      perCapita: false,
      info: null,
      date: "",
      denom: "Count_Person",
      mapPointSv: "",
      metahash: "",
    },
  },
  display: {
    value: {
      domain: [-10, 50, 100],
      color: "red",
      showMapPoints: false,
      showTimeSlider: false,
      allowLeaflet: false,
    },
  },
} as unknown as ContextType;

test("updateHashPlaceInfo", () => {
  history.pushState = jest.fn();
  const resultHash = updateHashPlaceInfo("", TestContext.placeInfo.value);
  const expectedHash = "&pd=geoId/10&ept=County";
  expect(resultHash).toEqual(expectedHash);
});

test("updateHashStatVarInfo", () => {
  history.pushState = jest.fn();
  const resultHash = updateHashStatVar("", TestContext.statVar.value);
  const expectedHash = "&sv=Count_Person&pc=0&denom=Count_Person";
  expect(resultHash).toEqual(expectedHash);
});

test("updateHashDisplay", () => {
  history.pushState = jest.fn();
  const resultHash = updateHashDisplay("", TestContext.display.value);
  const expectedHash = "&color=red&domain=-10:50:100";
  expect(resultHash).toEqual(expectedHash);
});

test("applyHashPlaceInfo", () => {
  const context = { statVar: {}, placeInfo: {} } as ContextType;
  context.placeInfo.set = (value) => (context.placeInfo.value = value);
  const urlParams = new URLSearchParams(
    decodeURIComponent(
      "#%26sv%3DCount_Person%26svn%3DPeople%26pc%3D0%26pd%3DgeoId%2F10&ept=County"
    ).replace("#", "?")
  );
  const placeInfo = applyHashPlaceInfo(urlParams);
  expect(placeInfo).toEqual({
    ...TestContext.placeInfo.value,
    selectedPlace: {
      dcid: "geoId/10",
      name: "",
      types: null,
    },
    parentPlaces: null,
  });
});

test("applyHashStatVarInfo", () => {
  const context = { statVar: {}, placeInfo: {} } as ContextType;
  context.statVar.set = (value) => (context.statVar.value = value);
  const urlParams = new URLSearchParams(
    decodeURIComponent(
      "#%26sv%3DCount_Person%26svn%3DPeople%26pc%3D0%26denom%3DCount_Person%26pd%3DgeoId%2F10%26pn%3DDelaware%26pt%3DCounty"
    ).replace("#", "?")
  );
  const statVar = applyHashStatVar(urlParams);
  expect(statVar).toEqual(TestContext.statVar.value);
});

test("applyHashDisplay", () => {
  const context = { statVar: {}, placeInfo: {}, display: {} } as ContextType;
  context.display.set = (value) => (context.display.value = value);
  const urlParams = new URLSearchParams(
    decodeURIComponent("%23%26domain%3D-10%3A50%3A100%26color%3Dred").replace(
      "#",
      "?"
    )
  );
  const display = applyHashDisplay(urlParams);
  expect(display).toEqual(TestContext.display.value);
});

test("get time slider dates", () => {
  const metadataMap = {
    "1355058237": {
      importName: "CensusACS5YearSurvey_SubjectTables_S2601APR",
      measurementMethod: "CensusACS5yrSurveySubjectTable",
      provenanceUrl:
        "https://data.census.gov/cedsci/table?q=S2601APR&tid=ACSST5Y2019.S2601APR",
      unit: "Years",
    },
    "2176550201": {
      importName: "USCensusPEP_Annual_Population",
      measurementMethod: "CensusPEPSurvey",
      observationPeriod: "P1Y",
      provenanceUrl: "https://www2.census.gov/programs-surveys/popest/tables",
    },
    "2763329611": {
      importName: "CensusACS5YearSurvey_SubjectTables_S2601A",
      measurementMethod: "CensusACS5yrSurveySubjectTable",
      provenanceUrl:
        "https://data.census.gov/cedsci/table?q=S2601A&tid=ACSST5Y2019.S2601A",
      unit: "Years",
    },
    "3690003977": {
      importName: "CensusACS5YearSurvey_SubjectTables_S2602",
      measurementMethod: "CensusACS5yrSurveySubjectTable",
      provenanceUrl:
        "https://data.census.gov/cedsci/table?q=S2602&tid=ACSST5Y2019.S2602",
      unit: "Years",
    },
    "3795540742": {
      importName: "CensusACS5YearSurvey",
      measurementMethod: "CensusACS5yrSurvey",
      provenanceUrl: "https://www.census.gov/",
      unit: "Year",
    },
    "3847894791": {
      importName: "CensusACS5YearSurvey_SubjectTables_S2602PR",
      measurementMethod: "CensusACS5yrSurveySubjectTable",
      provenanceUrl:
        "https://data.census.gov/cedsci/table?q=S2602PR&tid=ACSST5Y2019.S2602PR",
      unit: "Years",
    },
  };

  const placeStatDateWithinPlace = [
    {
      datePlaceCount: {
        "2011": 52,
        "2012": 52,
        "2013": 52,
        "2014": 52,
        "2015": 52,
        "2016": 52,
        "2017": 52,
        "2018": 52,
        "2019": 52,
        "2020": 52,
      },
      metadata: {
        importName: "CensusACS5YearSurvey",
        provenanceUrl: "https://www.census.gov/",
        measurementMethod: "CensusACS5yrSurvey",
        unit: "Year",
      },
    },
    {
      datePlaceCount: {
        "2010": 51,
        "2011": 51,
        "2012": 51,
        "2013": 51,
        "2014": 51,
        "2015": 51,
        "2016": 51,
        "2017": 51,
        "2018": 51,
        "2019": 51,
      },
      metadata: {
        importName: "CensusACS5YearSurvey_SubjectTables_S2601A",
        provenanceUrl:
          "https://data.census.gov/cedsci/table?q=S2601A&tid=ACSST5Y2019.S2601A",
        measurementMethod: "CensusACS5yrSurveySubjectTable",
        unit: "Years",
      },
    },
    {
      datePlaceCount: {
        "2010": 1,
        "2011": 1,
        "2012": 1,
        "2013": 1,
        "2014": 1,
        "2015": 1,
        "2016": 1,
        "2017": 1,
        "2018": 1,
        "2019": 1,
      },
      metadata: {
        importName: "CensusACS5YearSurvey_SubjectTables_S2601APR",
        provenanceUrl:
          "https://data.census.gov/cedsci/table?q=S2601APR&tid=ACSST5Y2019.S2601APR",
        measurementMethod: "CensusACS5yrSurveySubjectTable",
        unit: "Years",
      },
    },
    {
      datePlaceCount: {
        "2017": 51,
        "2018": 51,
        "2019": 51,
      },
      metadata: {
        importName: "CensusACS5YearSurvey_SubjectTables_S2602",
        provenanceUrl:
          "https://data.census.gov/cedsci/table?q=S2602&tid=ACSST5Y2019.S2602",
        measurementMethod: "CensusACS5yrSurveySubjectTable",
        unit: "Years",
      },
    },
    {
      datePlaceCount: {
        "2017": 1,
        "2018": 1,
        "2019": 1,
      },
      metadata: {
        importName: "CensusACS5YearSurvey_SubjectTables_S2602PR",
        provenanceUrl:
          "https://data.census.gov/cedsci/table?q=S2602PR&tid=ACSST5Y2019.S2602PR",
        measurementMethod: "CensusACS5yrSurveySubjectTable",
        unit: "Years",
      },
    },
  ];

  const sampleDates = {
    "1355058237": [
      "2010",
      "2011",
      "2012",
      "2013",
      "2014",
      "2015",
      "2016",
      "2017",
      "2018",
      "2019",
    ],
    "2763329611": [
      "2010",
      "2011",
      "2012",
      "2013",
      "2014",
      "2015",
      "2016",
      "2017",
      "2018",
      "2019",
    ],
    "3690003977": ["2017", "2018", "2019"],
    "3795540742": [
      "2011",
      "2012",
      "2013",
      "2014",
      "2015",
      "2016",
      "2017",
      "2018",
      "2019",
      "2020",
    ],
    "3847894791": ["2017", "2018", "2019"],
    "Best Available": ["3795540742"],
  };
  expect(getTimeSliderDates(metadataMap, placeStatDateWithinPlace)).toEqual(
    sampleDates
  );
});
