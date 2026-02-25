/**
 * Copyright 2022 Google LLC
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

import theme from "../theme/theme";

jest.mock("axios");
jest.mock("../chart/draw_d3_map");
jest.mock("../chart/draw_map_utils");
jest.mock("../chart/draw_scatter");
jest.mock("../chart/draw_bar", () => {
  const originalModule = jest.requireActual("../chart/draw_bar");
  return {
    __esModule: true,
    ...originalModule,
    drawGroupBarChart: jest.fn(),
    drawGroupLineChart: jest.fn(),
    drawStackBarChart: jest.fn(),
  };
});
jest.mock("../chart/draw_histogram", () => {
  const originalModule = jest.requireActual("../chart/draw_histogram");
  return {
    __esModule: true,
    ...originalModule,
    drawHistogram: jest.fn(),
  };
});
jest.mock("../chart/draw_line", () => {
  const originalModule = jest.requireActual("../chart/draw_line");
  return {
    __esModule: true,
    ...originalModule,
    drawLineChart: jest.fn(),
    wrap: jest.fn(),
  };
});
jest.mock("../chart/draw_utils", () => {
  const originalModule = jest.requireActual("../chart/draw_utils");
  return {
    __esModule: true,
    ...originalModule,
    wrap: jest.fn(),
  };
});
jest.mock("../utils/app/explore_utils", () => {
  const originalModule = jest.requireActual("../utils/app/explore_utils");
  return {
    __esModule: true,
    ...originalModule,
    getTopics: jest.fn().mockImplementation(() => [{ text: TOPIC, url: "" }]),
  };
});

import { ThemeProvider } from "@emotion/react";
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import axios from "axios";
import React from "react";
import { act } from "react-dom/test-utils";
import { mockAllIsIntersecting } from "react-intersection-observer/test-utils";

import { FollowUpQuestions } from "../apps/explore/follow_up_questions";
import { PageOverview } from "../apps/explore/page_overview";
import { ResultHeaderSection } from "../apps/explore/result_header_section";
import { GeoJsonData, MapPoint } from "../chart/types";
import { StatVarHierarchy } from "../stat_var_hierarchy/stat_var_hierarchy";
import { StatVarHierarchySearch } from "../stat_var_hierarchy/stat_var_search";
import { Chart as MapToolChart } from "../tools/map/chart";
import {
  Context as MapContext,
  DisplayOptionsWrapper as MapDisplayOptionsWrapper,
  IsLoadingWrapper as MapIsLoadingWrapper,
  PlaceInfoWrapper as MapPlaceInfoWrapper,
  StatVarWrapper,
} from "../tools/map/context";
import { Chart as ScatterToolChart } from "../tools/scatter/chart";
import {
  AxisWrapper,
  Context as ScatterContext,
  DisplayOptionsWrapper as ScatterDisplayOptionsWrapper,
  IsLoadingWrapper as ScatterIsLoadingWrapper,
  PlaceInfoWrapper as ScatterPlaceInfoWrapper,
  SHOW_POPULATION_OFF,
} from "../tools/scatter/context";
import { ScatterChartType } from "../tools/scatter/util";
import { Chart as TimelineToolChart } from "../tools/timeline/chart";
import * as dataFetcher from "../tools/timeline/data_fetcher";
import { axiosMock } from "../tools/timeline/mock_functions";
import { TEST_SURFACE } from "./constants";
import { FacetSelectorFacetInfo } from "./facet_selector/facet_selector";
import {
  GA_EVENT_COMPONENT_IMPRESSION,
  GA_EVENT_COMPONENT_VIEW,
  GA_EVENT_PAGE_OVERVIEW_CLICK,
  GA_EVENT_RELATED_TOPICS_CLICK,
  GA_EVENT_RELATED_TOPICS_VIEW,
  GA_EVENT_STATVAR_HIERARCHY_CLICK,
  GA_EVENT_STATVAR_SEARCH_TRIGGERED,
  GA_EVENT_TOOL_CHART_OPTION_CLICK,
  GA_EVENT_TOOL_CHART_PLOT,
  GA_EVENT_TOOL_PLACE_ADD,
  GA_EVENT_TOOL_STAT_VAR_CLICK,
  GA_EVENT_TOOL_STAT_VAR_SEARCH_NO_RESULT,
  GA_EVENT_TOTAL_ANCHOR_COUNT,
  GA_EVENT_TOTAL_COMPONENT_VIEW_TIME,
  GA_PARAM_CLICK_TRACKING_MODE,
  GA_PARAM_COMPONENT,
  GA_PARAM_COUNT_ANCHOR_ELEMENTS,
  GA_PARAM_PAGE_SOURCE,
  GA_PARAM_PLACE_DCID,
  GA_PARAM_RELATED_TOPICS_MODE,
  GA_PARAM_SEARCH_TERM,
  GA_PARAM_SOURCE,
  GA_PARAM_STAT_VAR,
  GA_PARAM_TOOL_CHART_OPTION,
  GA_PARAM_TOTAL_VIEW_TIME,
  GA_PARAM_VIEW_TRACKING_MODE,
  GA_VALUE_INITIAL_CLICK,
  GA_VALUE_INITIAL_VIEW,
  GA_VALUE_PAGE_EXPLORE,
  GA_VALUE_PAGE_OVERVIEW,
  GA_VALUE_RELATED_TOPICS_GENERATED_QUESTIONS,
  GA_VALUE_RELATED_TOPICS_HEADER_TOPICS,
  GA_VALUE_TOOL_CHART_OPTION_EDIT_SOURCES,
  GA_VALUE_TOOL_CHART_OPTION_LOG_SCALE,
  GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
  GA_VALUE_TOOL_CHART_OPTION_SHOW_DENSITY,
  GA_VALUE_TOOL_CHART_OPTION_SHOW_LABELS,
  GA_VALUE_TOOL_CHART_OPTION_SHOW_QUADRANTS,
  GA_VALUE_TOOL_CHART_OPTION_SWAP,
  GA_VALUE_TOOL_STAT_VAR_OPTION_HIERARCHY,
  GA_VALUE_TOTAL_CLICKS,
  GA_VALUE_TOTAL_VIEWS,
} from "./ga_events";
import { PlaceSelector } from "./place_selector";
import { StatVarInfo } from "./stat_var";
import { DataPointMetadata } from "./types";
import { NamedTypedPlace, StatVarHierarchyType, StatVarSummary } from "./types";

const PLACE_DCID = "geoId/05";
const PLACE_NAME = "Arkansas";
const STAT_VAR_1 = "Median_Income_Household";
const STAT_VAR_2 = "Median_Age_Person";
const STAT_VAR_3 = "Count_Person";
const STAT_VAR_4 = "Count_Farm";
const STAT_VAR_5 = "Annual_Generation_Electricity";

const NUMBER = 123;
const PLACE_ADDED = "africa";
const QUERY = "What is the health equity in Mountain View?";
const TOPIC = "Health Equity";
const PAGE_OVERVIEW = `To explore the rate of education in El Paso, the population's educational attainment can be investigated.
The population with <associate's>, <bachelor's>, and doctorate degrees, along with overall educational attainment levels, represent key variables for this inquiry.
Additionally, <student enrollment> across various educational levels can be examined to understand educational participation.`;
const STAT_VAR_CHART_LINKS = [
  {
    statVarTitle: "Population With Associates Degree by Gender",
    naturalLanguage: "associate's",
  },
  {
    statVarTitle: "Population With Bachelors Degree by Gender",
    naturalLanguage: "bachelor's",
  },
  {
    statVarTitle: "Population Enrolled in Public School by Race",
    naturalLanguage: "student enrollment",
  },
];

// Props for map tool chart.
const MAP_POINTS: MapPoint[] = [
  {
    latitude: NUMBER,
    longitude: NUMBER,
    placeDcid: PLACE_DCID,
    placeName: PLACE_NAME,
  },
];
const MAP_PROPS = {
  breadcrumbDataValues: { PLACE_DCID: NUMBER },
  dates: new Set<string>([""]),
  geoJsonData: {
    features: [],
    properties: {
      currentGeo: PLACE_DCID,
    },
    type: "FeatureCollection",
  } as GeoJsonData,
  mapDataValues: { [PLACE_DCID]: NUMBER },
  metadata: { [PLACE_DCID]: {} as DataPointMetadata },
  sources: new Set<string>([""]),
  unit: "",
  mapPointValues: { [PLACE_DCID]: NUMBER },
  mapPoints: MAP_POINTS,
  europeanCountries: [],
  rankingLink: "",
  facetList: [
    {
      dcid: STAT_VAR_1,
      displayNames: {},
      metadataMap: {},
      name: STAT_VAR_1,
    },
  ],
  facetListError: false,
  facetListLoading: false,
  sampleDates: [],
  metahash: "",
  onPlay: (): null => null,
  updateDate: (): null => null,
  geoRaster: null,
  children: null,
};

// Props for timeline tool chart.
const TIMELINE_PROPS = {
  denom: "",
  delta: false,
  chartId: "",
  onDataUpdate: (): null => null,
  onMetadataMapUpdate: (): null => null,
  placeNameMap: { [PLACE_DCID]: PLACE_NAME },
  pc: false,
  removeStatVar: (): null => null,
  statVarInfos: { [STAT_VAR_1]: { title: "" } } as Record<string, StatVarInfo>,
  svFacetId: { [STAT_VAR_1]: "" },
  surface: TEST_SURFACE,
};

// Props and context for scatter plot tool chart.
const SCATTER_PROPS = {
  points: {
    [PLACE_DCID]: {
      place: { name: "", dcid: "" },
      xVal: NUMBER,
      xDate: "",
      yVal: NUMBER,
      yDate: "",
    },
  },
  xLabel: STAT_VAR_1,
  xLog: false,
  xPerCapita: false,
  yLabel: STAT_VAR_2,
  yLog: false,
  yPerCapita: false,
  placeInfo: {
    enclosingPlace: { dcid: PLACE_DCID, name: PLACE_NAME, types: [] },
    enclosedPlaceType: "",
    enclosedPlaces: [],
    parentPlaces: [],
    lowerBound: NUMBER,
    upperBound: NUMBER,
  },
  display: {
    showQuadrants: false,
    showLabels: false,
    chartType: ScatterChartType.SCATTER,
    showDensity: false,
    showPopulation: SHOW_POPULATION_OFF,
    showRegression: false,
  } as ScatterDisplayOptionsWrapper,
  sources: new Set<string>([""]),
  svFacetId: { [STAT_VAR_1]: "" },
  facetList: [
    {
      dcid: STAT_VAR_1,
      name: STAT_VAR_1,
      metadataMap: {},
    },
    {
      dcid: STAT_VAR_2,
      name: STAT_VAR_2,
      metadataMap: {},
    },
  ],
  facetListLoading: false,
  facetListError: false,
  onSvFacetIdUpdated: (): null => null,
  facets: {},
  statVarToFacets: {},
  statVarSpecs: [],
};

const PAGE_METADATA_PROPS = {
  place: {
    name: PLACE_NAME,
    dcid: PLACE_DCID,
    types: [],
  },
  places: [],
  pageConfig: {
    metadata: {
      topicId: "",
      topicName: "",
      containedPlaceTypes: {},
      eventTypeSpec: {},
    },
    categories: [
      {
        title: "",
        blocks: [
          {
            columns: [],
            title: "Population With Associates Degree by Gender",
            category: 0,
            index: 0,
          },
          {
            columns: [],
            title: "Population With Bachelors Degree by Gender",
            category: 0,
            index: 1,
          },
          {
            columns: [],
            title: "Population Enrolled in Public School by Race",
            category: 0,
            index: 2,
          },
        ],
      },
    ],
  },
  mainTopics: [{ name: PLACE_NAME, dcid: PLACE_DCID, types: [] }],
};

const FOLLOW_UP_QUESTIONS_PROPS = {
  query: QUERY,
  pageMetadata: PAGE_METADATA_PROPS,
};

const PAGE_OVERVIEW_PROPS = {
  query: QUERY,
  pageMetadata: PAGE_METADATA_PROPS,
};

const RESULT_HEADER_SECTION_PROPS = {
  placeUrlVal: "",
  pageMetadata: PAGE_METADATA_PROPS,
  hideRelatedTopics: false,
  query: QUERY,
};

const MAP_CONTEXT = {
  dateCtx: {
    value: "",
    set: (): null => null,
  },
  isLoading: {} as MapIsLoadingWrapper,
  display: {
    value: {
      color: "",
      domain: [NUMBER, NUMBER, NUMBER] as [number, number, number],
      showMapPoints: false,
      showTimeSlider: false,
    },
  } as MapDisplayOptionsWrapper,
  placeInfo: {
    value: {
      enclosedPlaceType: "",
      enclosingPlace: { dcid: PLACE_DCID, name: PLACE_NAME },
      mapPointPlaceType: "",
      parentPlaces: [],
      selectedPlace: { dcid: PLACE_DCID, name: PLACE_NAME, types: [] },
    },
    set: () => null,
    setSelectedPlace: () => null,
    setParentPlaces: () => null,
    setEnclosingPlace: () => null,
    setEnclosedPlaceType: () => null,
    setMapPointPlaceType: () => null,
  } as MapPlaceInfoWrapper,
  statVar: {
    value: {
      date: "",
      dcid: STAT_VAR_1,
      denom: "",
      info: {},
      mapPointSv: "",
      metahash: "",
      perCapita: false,
    },
    set: () => null,
    setInfo: () => null,
    setDcid: () => null,
    setPerCapita: () => null,
    setDate: () => null,
    setDenom: () => null,
    setMapPointSv: () => null,
    setMetahash: () => null,
  } as StatVarWrapper,
};

const SCATTER_CONTEXT = {
  x: {
    value: {
      statVarInfo: {},
      statVarDcid: "",
      log: false,
      perCapita: false,
      date: "",
      metahash: "",
      denom: "",
    },
    set: () => null,
    setStatVarDcid: () => null,
    unsetStatVarDcid: () => null,
    setStatVarInfo: () => null,
    setLog: () => null,
    setPerCapita: () => null,
    setDate: () => null,
    setMetahash: () => null,
    setDenom: () => null,
  } as AxisWrapper,
  y: {
    value: {
      statVarInfo: {},
      statVarDcid: "",
      log: false,
      perCapita: false,
      date: "",
      metahash: "",
      denom: "",
    },
    set: () => null,
    setStatVarDcid: () => null,
    unsetStatVarDcid: () => null,
    setStatVarInfo: () => null,
    setLog: () => null,
    setPerCapita: () => null,
    setDate: () => null,
    setMetahash: () => null,
    setDenom: () => null,
  } as AxisWrapper,
  place: {
    value: {
      enclosingPlace: { dcid: PLACE_DCID, name: PLACE_NAME, types: [] },
      enclosedPlaceType: "",
      enclosedPlaces: [],
      parentPlaces: [],
    },
  } as ScatterPlaceInfoWrapper,
  display: {
    showQuadrants: false,
    showLabels: false,
    chartType: ScatterChartType.SCATTER,
    showDensity: false,
    showPopulation: SHOW_POPULATION_OFF,
    showRegression: false,
    setQuadrants: () => null,
    setLabels: () => null,
    setChartType: () => null,
    setDensity: () => null,
    setPopulation: () => null,
    setRegression: () => null,
  } as ScatterDisplayOptionsWrapper,
  isLoading: {} as ScatterIsLoadingWrapper,
};

// Props for stat var hierarchy.
const STAT_VAR_HIERARCHY_PROPS = {
  path: ["dc/g/Demographics", STAT_VAR_2],
  statVar: {
    id: STAT_VAR_2,
    specializedEntity: "",
    displayName: STAT_VAR_2,
    hasData: true,
  },
  selected: false,
  summary: {} as StatVarSummary,
  prefixToReplace: "",

  type: StatVarHierarchyType.TIMELINE,
  entities: [{ name: PLACE_NAME, dcid: PLACE_DCID }],
  selectedSVs: [STAT_VAR_2],
  selectSV: (): null => null,
  deselectSV: (): null => null,
};
const originalFeatureFlags = globalThis.FEATURE_FLAGS;

beforeEach(() => {
  jest.spyOn(axios, "get").mockImplementation(() => Promise.resolve(null));
  jest.spyOn(axios, "post").mockImplementation(() => Promise.resolve(null));
  // Make a copy of the original FEATURE_FLAGS object
  globalThis.FEATURE_FLAGS = { ...originalFeatureFlags };
});

// Unmount react trees that were mounted with render and clear all mocks.
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  // Restore the original FEATURE_FLAGS object
  globalThis.FEATURE_FLAGS = originalFeatureFlags;
});

describe("test ga event tool chart plot", () => {
  test("call gtag when a map tool chart is mounted or updated with different stat vars or places", async () => {
    // Mock gtag.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // When the component is mounted.
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <MapContext.Provider value={MAP_CONTEXT}>
          <MapToolChart {...MAP_PROPS} />
        </MapContext.Provider>
      </ThemeProvider>
    );
    await waitFor(() => {
      // Check the parameters passed to gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_PLOT,
        {
          [GA_PARAM_STAT_VAR]: STAT_VAR_1,
          [GA_PARAM_PLACE_DCID]: PLACE_DCID,
        },
      ]);
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(1);
    });

    // When the component is rerendered with the same props.
    rerender(
      <ThemeProvider theme={theme}>
        <MapContext.Provider value={MAP_CONTEXT}>
          <MapToolChart {...MAP_PROPS} />
        </MapContext.Provider>
      </ThemeProvider>
    );
    await waitFor(() =>
      // Check gtag is not called.
      expect(mockgtag.mock.calls.length).toEqual(1)
    );

    // When stat var changes.
    MAP_CONTEXT.statVar.value.dcid = STAT_VAR_2;
    rerender(
      <ThemeProvider theme={theme}>
        <MapContext.Provider value={MAP_CONTEXT}>
          <MapToolChart {...MAP_PROPS} />
        </MapContext.Provider>
      </ThemeProvider>
    );
    await waitFor(() => {
      // Check gtag is called once, two time in total.
      expect(mockgtag.mock.calls.length).toEqual(2);
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.calls).toContainEqual([
        "event",
        GA_EVENT_TOOL_CHART_PLOT,
        {
          [GA_PARAM_STAT_VAR]: STAT_VAR_2,
          [GA_PARAM_PLACE_DCID]: PLACE_DCID,
        },
      ]);
    });
  });
  test("call gtag when a timeline tool chart is mounted or updated with different stat vars or places ", async () => {
    // Mock gtag.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;
    // Mock fetch data.
    jest
      .spyOn(dataFetcher, "fetchRawData")
      .mockImplementation(() => Promise.resolve(null));

    // When the component is mounted.
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <TimelineToolChart {...TIMELINE_PROPS} />)
      </ThemeProvider>
    );
    await waitFor(() => {
      // Check the parameters passed to gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_PLOT,
        {
          [GA_PARAM_STAT_VAR]: [STAT_VAR_1],
          [GA_PARAM_PLACE_DCID]: [PLACE_DCID],
        },
      ]);
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(1);
    });

    // When the component is rerendered with the same props.
    rerender(
      <ThemeProvider theme={theme}>
        <TimelineToolChart {...TIMELINE_PROPS} />
      </ThemeProvider>
    );
    await waitFor(() =>
      // Check gtag is called.
      expect(mockgtag.mock.calls.length).toEqual(1)
    );

    // When stat var changes.
    TIMELINE_PROPS.statVarInfos = { [STAT_VAR_2]: { title: null } };
    rerender(
      <ThemeProvider theme={theme}>
        <TimelineToolChart {...TIMELINE_PROPS} />
      </ThemeProvider>
    );
    await waitFor(() => {
      // Check gtag is called once, two time in total.
      expect(mockgtag.mock.calls.length).toEqual(2);
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_PLOT,
        {
          [GA_PARAM_STAT_VAR]: [STAT_VAR_2],
          [GA_PARAM_PLACE_DCID]: [PLACE_DCID],
        },
      ]);
    });
  });
  test("call gtag when a scatter tool chart is mounted or updated with different stat vars or places ", async () => {
    // Mock gtag.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // When the component is mounted.
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <ScatterContext.Provider value={SCATTER_CONTEXT}>
          <ScatterToolChart {...SCATTER_PROPS} />
        </ScatterContext.Provider>
      </ThemeProvider>
    );
    await waitFor(() => {
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_PLOT,
        {
          [GA_PARAM_STAT_VAR]: [STAT_VAR_2, STAT_VAR_1],
          [GA_PARAM_PLACE_DCID]: PLACE_DCID,
        },
      ]);
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(1);
    });

    // When the component is rerendered with the same props.
    rerender(
      <ThemeProvider theme={theme}>
        <ScatterContext.Provider value={SCATTER_CONTEXT}>
          <ScatterToolChart {...SCATTER_PROPS} />
        </ScatterContext.Provider>
      </ThemeProvider>
    );
    await waitFor(() =>
      // Check gtag is not called.
      expect(mockgtag.mock.calls.length).toEqual(1)
    );

    // When stat var changes.
    SCATTER_PROPS.facetList = [
      {
        dcid: STAT_VAR_2,
        name: STAT_VAR_2,
        metadataMap: {},
      },
      {
        dcid: STAT_VAR_3,
        name: STAT_VAR_3,
        metadataMap: {},
      },
    ];
    rerender(
      <ThemeProvider theme={theme}>
        <ScatterContext.Provider value={SCATTER_CONTEXT}>
          <ScatterToolChart {...SCATTER_PROPS} />
        </ScatterContext.Provider>
      </ThemeProvider>
    );
    await waitFor(() => {
      // Check gtag is called once, two times in total.
      expect(mockgtag.mock.calls.length).toEqual(2);
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_PLOT,
        {
          [GA_PARAM_STAT_VAR]: [STAT_VAR_3, STAT_VAR_2],
          [GA_PARAM_PLACE_DCID]: PLACE_DCID,
        },
      ]);
    });
  });
});

describe("test ga event tool stat var click", () => {
  test("call gtag when a stat var is selected in the stat var hierarchy", async () => {
    // Mock gtag.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;
    // Mock child stat var groups.
    axiosMock();

    // When the component is rendered.
    const statVarHierarchy = render(
      <StatVarHierarchy {...STAT_VAR_HIERARCHY_PROPS} />
    );
    // Wait for the collapsible__trigger to get rendered.
    await waitFor(() => {
      expect(
        statVarHierarchy.container.getElementsByClassName(
          "Collapsible__trigger"
        )[0]
      ).toBeTruthy();
    });

    // Click collapsible trigger.
    fireEvent.click(
      statVarHierarchy.container.getElementsByClassName(
        "Collapsible__trigger"
      )[0]
    );
    const inputId = "#" + STAT_VAR_3 + "dc\\/g\\/Demographics-" + STAT_VAR_3;
    // Wait for stat vars to get rendered.
    await waitFor(() => {
      expect(statVarHierarchy.container.querySelector(inputId)).toBeTruthy();
    });

    // Click the checkbox of the stat var.
    fireEvent.click(
      statVarHierarchy.container.querySelector(inputId) as Element,
      {
        target: { checked: true },
      }
    );
    await waitFor(() => {
      // Check gtag is called.
      expect(mockgtag.mock.calls.length).toEqual(2);
      // Check that the first event called is GA_EVENT_STATVAR_HIERARCHY_CLICK
      expect(mockgtag.mock.calls[0]).toEqual([
        "event",
        GA_EVENT_STATVAR_HIERARCHY_CLICK,
        {},
      ]);
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_STAT_VAR_CLICK,
        {
          [GA_PARAM_SOURCE]: GA_VALUE_TOOL_STAT_VAR_OPTION_HIERARCHY,
          [GA_PARAM_STAT_VAR]: STAT_VAR_3,
        },
      ]);
    });
  });
});

describe("test ga event tool place add", () => {
  test("call gtag when a place is added in the place search bar", async () => {
    const props = {
      selectedPlace: {
        types: null,
      } as NamedTypedPlace,
      enclosedPlaceType: "",
      onPlaceSelected: (): null => null,
      onEnclosedPlaceTypeSelected: (): null => null,
    };
    // Mock gtag.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;
    // Mock google maps.
    window.google = {
      maps: {
        places: {
          Autocomplete: jest.fn().mockImplementation((elem) => {
            return {
              addListener: (_placeChanged, callback): void => {
                elem.addEventListener("change", callback);
              },
              getPlace: (): { name: string } => {
                return { name: PLACE_ADDED };
              },
            };
          }),
        },
      },
    } as any;

    // Render the component.
    const placeSelector = render(<PlaceSelector {...props} />);
    await waitFor(() =>
      expect(placeSelector.container.querySelector("#ac")).toBeTruthy()
    );

    // Use the hardcoded result as place autocomplete.
    fireEvent.change(placeSelector.container.querySelector("#ac") as Element, {
      target: { value: PLACE_ADDED },
    });
    await waitFor(() => {
      // Check the gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(1);
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_PLACE_ADD,
        {
          [GA_PARAM_PLACE_DCID]: PLACE_ADDED,
        },
      ]);
    });
  });
});

describe("test ga event tool stat var search no result", () => {
  test("call gtag when no result is shown to search term in stat var hierarchy", async () => {
    // Mock gtag.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Render the component.
    const props = {
      entities: [""],
      onSelectionChange: (): null => null,
    };
    const statVarSearch = render(<StatVarHierarchySearch {...props} />);

    // Input the search term.
    fireEvent.change(
      statVarSearch.container.getElementsByClassName("statvar-search-input")[0],
      { target: { value: STAT_VAR_1 } }
    );
    await waitFor(() => {
      // Check the gtag is called.
      expect(mockgtag.mock.calls.length).toEqual(2);
      // Check that the first event is GA_EVENT_STATVAR_SEARCH_TRIGGERED
      expect(mockgtag.mock.calls[0]).toEqual([
        "event",
        GA_EVENT_STATVAR_SEARCH_TRIGGERED,
        {},
      ]);
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_STAT_VAR_SEARCH_NO_RESULT,
        {
          [GA_PARAM_SEARCH_TERM]: STAT_VAR_1,
        },
      ]);
    });
  });
});

describe("test ga event tool chart plot option", () => {
  test("call gtag when timeline tool chart option is clicked", async () => {
    // Mock gtag.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;
    // Mock fetch data.
    jest
      .spyOn(dataFetcher, "fetchRawData")
      .mockImplementation(() => Promise.resolve(null));

    // Render the component.
    TIMELINE_PROPS.statVarInfos = {
      [STAT_VAR_4]: { title: "", pcAllowed: true }, // Use a stat var with per capita option enabled.
    };
    const timelineToolChart = render(
      <ThemeProvider theme={theme}>
        <TimelineToolChart {...TIMELINE_PROPS} />
      </ThemeProvider>
    );
    // Wait for gtag event tool chart plot to be called.
    await waitFor(() => expect(mockgtag.mock.calls.length).toEqual(1));

    // Click the checkbox of per capita.
    fireEvent.click(
      timelineToolChart.container.getElementsByClassName("form-check-input")[0],
      { target: { checked: true } }
    );
    await waitFor(() => {
      // Check the gtag is called once, two times in total.
      expect(mockgtag.mock.calls.length).toEqual(2);
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_OPTION_CLICK,
        {
          [GA_PARAM_TOOL_CHART_OPTION]: GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
        },
      ]);
    });
  });
  test("call gtag when scatter tool chart option is clicked", async () => {
    // Mock gtag.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Render the component.
    SCATTER_CONTEXT.y.value.statVarDcid = STAT_VAR_4;
    SCATTER_CONTEXT.y.value.statVarInfo.pcAllowed = true;
    SCATTER_CONTEXT.x.value.statVarDcid = STAT_VAR_5;
    SCATTER_CONTEXT.x.value.statVarInfo.pcAllowed = true;
    SCATTER_PROPS.yLabel = STAT_VAR_4;
    SCATTER_PROPS.xLabel = STAT_VAR_5;
    SCATTER_PROPS.facetList = [
      {
        dcid: STAT_VAR_5,
        name: STAT_VAR_5,
        metadataMap: {},
      },
      {
        dcid: STAT_VAR_4,
        name: STAT_VAR_4,
        metadataMap: {},
      },
    ];
    const scatterToolChart = render(
      <ThemeProvider theme={theme}>
        <ScatterContext.Provider value={SCATTER_CONTEXT}>
          <ScatterToolChart {...SCATTER_PROPS} />
        </ScatterContext.Provider>
      </ThemeProvider>
    );
    // Wait for gtag event tool chart plot to be called.
    await waitFor(() => expect(mockgtag.mock.calls.length).toEqual(1));

    // Click checkbox of per capita.
    fireEvent.click(
      scatterToolChart.container.querySelector("#per-capita-y") as Element,
      {
        target: { checked: true },
      }
    );
    await waitFor(() => {
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_OPTION_CLICK,
        {
          [GA_PARAM_TOOL_CHART_OPTION]: GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
        },
      ]);
      // Check gtag is called once, two times in total.
      expect(mockgtag.mock.calls.length).toEqual(2);
    });

    // Click checkbox of log scale.
    fireEvent.click(
      scatterToolChart.container.querySelector("#log-y") as Element,
      {
        target: { checked: true },
      }
    );
    await waitFor(() => {
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_OPTION_CLICK,
        {
          [GA_PARAM_TOOL_CHART_OPTION]: GA_VALUE_TOOL_CHART_OPTION_LOG_SCALE,
        },
      ]);
      // Check gtag is called once, three time in total.
      expect(mockgtag.mock.calls.length).toEqual(3);
    });

    // Click swap x and y axis.
    fireEvent.click(
      scatterToolChart.container.querySelector("#swap-axes") as Element
    );
    await waitFor(() => {
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_OPTION_CLICK,
        {
          [GA_PARAM_TOOL_CHART_OPTION]: GA_VALUE_TOOL_CHART_OPTION_SWAP,
        },
      ]);
      // Check gtag is called once, four times in total.
      expect(mockgtag.mock.calls.length).toEqual(4);
    });

    // Click checkbox of show quandrants.
    fireEvent.click(
      scatterToolChart.container.querySelector("#quadrants") as Element,
      {
        target: { checked: true },
      }
    );
    await waitFor(() => {
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_OPTION_CLICK,
        {
          [GA_PARAM_TOOL_CHART_OPTION]:
            GA_VALUE_TOOL_CHART_OPTION_SHOW_QUADRANTS,
        },
      ]);
      // Check gtag is called once, five times in total.
      expect(mockgtag.mock.calls.length).toEqual(5);
    });

    // Click the checkbox of show labels.
    fireEvent.click(
      scatterToolChart.container.querySelectorAll("#quadrants")[1],
      { target: { checked: true } }
    );
    await waitFor(() => {
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_OPTION_CLICK,
        {
          [GA_PARAM_TOOL_CHART_OPTION]: GA_VALUE_TOOL_CHART_OPTION_SHOW_LABELS,
        },
      ]);
      // Check gtag is called once, six times in total.
      expect(mockgtag.mock.calls.length).toEqual(6);
    });

    // Click the checkbox of show density.
    fireEvent.click(
      scatterToolChart.container.querySelector("#density") as Element,
      {
        target: { checked: true },
      }
    );
    await waitFor(() => {
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_OPTION_CLICK,
        {
          [GA_PARAM_TOOL_CHART_OPTION]: GA_VALUE_TOOL_CHART_OPTION_SHOW_DENSITY,
        },
      ]);
      // Check gtag is called once, seven times in total.
      expect(mockgtag.mock.calls.length).toEqual(7);
    });
  });
  test("call gtag when map tool chart option is clicked", async () => {
    // Mock gtag.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Render the component.
    MAP_CONTEXT.statVar.value.dcid = STAT_VAR_4;
    MAP_CONTEXT.statVar.value.info = {
      [STAT_VAR_4]: { title: "", pcAllowed: true }, // Use a stat var with per capita option enabled.
    };
    MAP_PROPS.facetList = [
      {
        dcid: STAT_VAR_4, // Use a stat var with per capita option enabled.
        name: STAT_VAR_4,
        displayNames: {},
        metadataMap: {},
      },
    ];
    const mapToolChart = render(
      <ThemeProvider theme={theme}>
        <MapContext.Provider value={MAP_CONTEXT}>
          <MapToolChart {...MAP_PROPS} />
        </MapContext.Provider>
      </ThemeProvider>
    );
    await waitFor(() => expect(mockgtag.mock.calls.length).toEqual(1));

    // Click the checkbox of per capita.
    fireEvent.click(
      mapToolChart.container.getElementsByClassName("form-check-input")[0],
      { target: { checked: true } }
    );
    await waitFor(() => {
      // Check the gtag is called once, two times in total.
      expect(mockgtag.mock.calls.length).toEqual(2);
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_OPTION_CLICK,
        {
          [GA_PARAM_TOOL_CHART_OPTION]: GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
        },
      ]);
    });
  });
});

describe("test ga event for the FacetSelector component", () => {
  test("triggers GA event when FacetSelector's update button is clicked", async () => {
    const { ToolChartHeader } = await import(
      "../tools/shared/vis_tools/tool_chart_header"
    );

    // Mock gtag
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Mock facet list to allow the dialog to open.
    const mockFacetList: FacetSelectorFacetInfo[] = [
      {
        dcid: STAT_VAR_1,
        name: STAT_VAR_1,
        metadataMap: {
          facet1: {
            importName: "Test Import One",
            measurementMethod: "Test Method One",
            observationPeriod: "P1Y",
            scalingFactor: "1",
            unit: "USD",
          },
          facet2: {
            importName: "Test Import One",
            measurementMethod: "Test Method One",
            observationPeriod: "P1M",
          },
        },
      },
    ];

    const mockOnSvFacetIdUpdated = jest.fn();
    const svFacetId = { [STAT_VAR_1]: "facet1" };

    const { getByText } = render(
      <ThemeProvider theme={theme}>
        <ToolChartHeader
          svFacetId={svFacetId}
          facetList={mockFacetList}
          facetListLoading={false}
          facetListError={false}
          onSvFacetIdUpdated={mockOnSvFacetIdUpdated}
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      const button = getByText(/Explore other facets/i);
      expect((button as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(getByText(/Explore other facets/i));

    await waitFor(() => {
      expect(getByText("Update")).toBeTruthy();
    });

    fireEvent.click(getByText("Update"));

    await waitFor(() => {
      expect(mockgtag).toHaveBeenCalledWith(
        "event",
        GA_EVENT_TOOL_CHART_OPTION_CLICK,
        {
          [GA_PARAM_TOOL_CHART_OPTION]: GA_VALUE_TOOL_CHART_OPTION_EDIT_SOURCES,
        }
      );
    });
  });
});

describe("test ga event for Related Topics experiment", () => {
  test("triggers GA event when FollowUpQuestion URL is clicked", async () => {
    // Mock gtag
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    axios.post = jest.fn().mockImplementation(() => {
      // eslint-disable-next-line camelcase
      return Promise.resolve({ data: { follow_up_questions: [QUERY] } });
    });

    // Render follow up component
    const followUp = render(
      <ThemeProvider theme={theme}>
        <FollowUpQuestions {...FOLLOW_UP_QUESTIONS_PROPS} />
      </ThemeProvider>
    );
    act(() => {
      mockAllIsIntersecting(false);
    });

    // Wait for questions to render
    await waitForElementToBeRemoved(followUp.getByText("Loading..."));

    // Click question url
    fireEvent.click(followUp.getByText(QUERY));

    await waitFor(() => {
      expect(mockgtag).toHaveBeenCalledWith(
        "event",
        GA_EVENT_RELATED_TOPICS_CLICK,
        {
          [GA_PARAM_RELATED_TOPICS_MODE]:
            GA_VALUE_RELATED_TOPICS_GENERATED_QUESTIONS,
        }
      );
    });
  });
  test("triggers GA event when Header Related Topics URL is clicked", async () => {
    // Mock gtag
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Render result header component
    const resultHeader = render(
      <ResultHeaderSection {...RESULT_HEADER_SECTION_PROPS} />
    );

    // Click related topic url
    fireEvent.click(resultHeader.getByText(TOPIC));

    await waitFor(() => {
      expect(mockgtag).toHaveBeenCalledWith(
        "event",
        GA_EVENT_RELATED_TOPICS_CLICK,
        {
          [GA_PARAM_RELATED_TOPICS_MODE]: GA_VALUE_RELATED_TOPICS_HEADER_TOPICS,
        }
      );
    });
  });
  test("triggers GA event when FollowUpQuestion component is viewed", async () => {
    // Mock gtag
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Render follow up component
    render(
      <ThemeProvider theme={theme}>
        <FollowUpQuestions {...FOLLOW_UP_QUESTIONS_PROPS} />
      </ThemeProvider>
    );
    act(() => {
      mockAllIsIntersecting(true);
    });
    await waitFor(() => {
      expect(mockgtag).toHaveBeenCalledWith(
        "event",
        GA_EVENT_RELATED_TOPICS_VIEW,
        {
          [GA_PARAM_RELATED_TOPICS_MODE]:
            GA_VALUE_RELATED_TOPICS_GENERATED_QUESTIONS,
        }
      );
    });
  });
  test("triggers GA event when Header RelatedTopics component is viewed", async () => {
    // Mock gtag
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Render result header component
    render(<ResultHeaderSection {...RESULT_HEADER_SECTION_PROPS} />);
    act(() => {
      mockAllIsIntersecting(true);
    });
    await waitFor(() => {
      expect(mockgtag).toHaveBeenCalledWith(
        "event",
        GA_EVENT_RELATED_TOPICS_VIEW,
        {
          [GA_PARAM_RELATED_TOPICS_MODE]: GA_VALUE_RELATED_TOPICS_HEADER_TOPICS,
        }
      );
    });
  });
  test("triggers GA event when Follow Up Questions component renders questions", async () => {
    // Mock gtag
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Mock Flask route
    axios.post = jest.fn().mockImplementation(() => {
      // eslint-disable-next-line camelcase
      return Promise.resolve({ data: { follow_up_questions: [QUERY] } });
    });

    // Render follow up component
    render(
      <ThemeProvider theme={theme}>
        <FollowUpQuestions {...FOLLOW_UP_QUESTIONS_PROPS} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(mockgtag).toHaveBeenCalledWith(
        "event",
        GA_EVENT_COMPONENT_IMPRESSION,
        {
          [GA_PARAM_PAGE_SOURCE]: GA_VALUE_PAGE_EXPLORE,
          [GA_PARAM_COMPONENT]: GA_VALUE_RELATED_TOPICS_GENERATED_QUESTIONS,
        }
      );
    });
  });
});

describe("test ga event for Page Overview experiment", () => {
  test("triggers GA event when Page Overview component is rendered", async () => {
    // Mock gtag
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Render page overview component
    render(
      <ThemeProvider theme={theme}>
        <PageOverview {...PAGE_OVERVIEW_PROPS} />
      </ThemeProvider>
    );
    act(() => {
      mockAllIsIntersecting(true);
    });
    await waitFor(() => {
      expect(mockgtag).toHaveBeenCalledWith(
        "event",
        GA_EVENT_COMPONENT_IMPRESSION,
        {
          [GA_PARAM_PAGE_SOURCE]: GA_VALUE_PAGE_EXPLORE,
          [GA_PARAM_COMPONENT]: GA_VALUE_PAGE_OVERVIEW,
        }
      );
    });
  });
  test("triggers GA event when Page Overview component is initially viewed", async () => {
    // Mock gtag
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Mock Flask route
    axios.post = jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: {
          pageOverview: PAGE_OVERVIEW,
          statVarChartLinks: STAT_VAR_CHART_LINKS,
        },
      })
    );

    // Render page overview component
    const pageOverview = render(
      <ThemeProvider theme={theme}>
        <PageOverview {...PAGE_OVERVIEW_PROPS} />
      </ThemeProvider>
    );

    // Wait for overview to render
    await waitForElementToBeRemoved(pageOverview.getByText("Loading..."));
    act(() => {
      mockAllIsIntersecting(true);
    });

    await waitFor(() => {
      expect(mockgtag).toHaveBeenCalledWith("event", GA_EVENT_COMPONENT_VIEW, {
        [GA_PARAM_PAGE_SOURCE]: GA_VALUE_PAGE_EXPLORE,
        [GA_PARAM_COMPONENT]: GA_VALUE_PAGE_OVERVIEW,
        [GA_PARAM_VIEW_TRACKING_MODE]: GA_VALUE_INITIAL_VIEW,
      });
    });
  });
  test("triggers GA event when Page Overview is viewed twice", async () => {
    // Mock gtag
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Mock Flask route
    axios.post = jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: {
          pageOverview: PAGE_OVERVIEW,
          statVarChartLinks: STAT_VAR_CHART_LINKS,
        },
      })
    );

    // Render page overview component
    const pageOverview = render(
      <ThemeProvider theme={theme}>
        <PageOverview {...PAGE_OVERVIEW_PROPS} />
      </ThemeProvider>
    );

    // Wait for overview to render
    await waitForElementToBeRemoved(pageOverview.getByText("Loading..."));

    act(() => {
      mockAllIsIntersecting(true);
    });
    await waitFor(() => {
      expect(mockgtag).toHaveBeenCalledWith("event", GA_EVENT_COMPONENT_VIEW, {
        [GA_PARAM_PAGE_SOURCE]: GA_VALUE_PAGE_EXPLORE,
        [GA_PARAM_COMPONENT]: GA_VALUE_PAGE_OVERVIEW,
        [GA_PARAM_VIEW_TRACKING_MODE]: GA_VALUE_TOTAL_VIEWS,
      });
    });
    // Mock scrolling back to the component
    act(() => {
      mockAllIsIntersecting(false);
      mockAllIsIntersecting(true);
    });

    await waitFor(() => {
      expect(mockgtag).toHaveBeenNthCalledWith(
        4,
        "event",
        GA_EVENT_COMPONENT_VIEW,
        {
          [GA_PARAM_PAGE_SOURCE]: GA_VALUE_PAGE_EXPLORE,
          [GA_PARAM_COMPONENT]: GA_VALUE_PAGE_OVERVIEW,
          [GA_PARAM_VIEW_TRACKING_MODE]: GA_VALUE_TOTAL_VIEWS,
        }
      );
    });
  });
  test("triggers GA event before unload, recording the view time of Page Overview", async () => {
    // Mock gtag
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    const startTime = 0;
    const fiveSecondsLater = startTime + 5000; // 5 seconds in milliseconds

    // Set up the spy
    const dateSpy = jest.spyOn(Date, "now").mockImplementation(() => startTime);

    // Mock Flask route
    axios.post = jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: {
          pageOverview: PAGE_OVERVIEW,
          statVarChartLinks: STAT_VAR_CHART_LINKS,
        },
      })
    );

    // Render page overview component
    const pageOverview = render(
      <ThemeProvider theme={theme}>
        <PageOverview {...PAGE_OVERVIEW_PROPS} />
      </ThemeProvider>
    );

    // Wait for overview to render
    await waitForElementToBeRemoved(pageOverview.getByText("Loading..."));

    act(() => {
      mockAllIsIntersecting(true);
    });

    dateSpy.mockReturnValueOnce(fiveSecondsLater);

    fireEvent(window, new Event("beforeunload"));

    dateSpy.mockRestore();

    await waitFor(() => {
      expect(mockgtag).toHaveBeenCalledWith(
        "event",
        GA_EVENT_TOTAL_COMPONENT_VIEW_TIME,
        {
          [GA_PARAM_PAGE_SOURCE]: GA_VALUE_PAGE_EXPLORE,
          [GA_PARAM_COMPONENT]: GA_VALUE_PAGE_OVERVIEW,
          [GA_PARAM_TOTAL_VIEW_TIME]: fiveSecondsLater.toString(),
        }
      );
    });
  });
  test("triggers GA event when Page Overview link is clicked", async () => {
    // Mock gtag
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Mock Flask route
    axios.post = jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: {
          pageOverview: PAGE_OVERVIEW,
          statVarChartLinks: STAT_VAR_CHART_LINKS,
        },
      })
    );

    // Render page overview component
    const pageOverview = render(
      <ThemeProvider theme={theme}>
        <PageOverview {...PAGE_OVERVIEW_PROPS} />
      </ThemeProvider>
    );

    // Wait for overview to render
    await waitForElementToBeRemoved(pageOverview.getByText("Loading..."));

    // Click scroll link
    fireEvent.click(
      pageOverview.getByText(STAT_VAR_CHART_LINKS[0].naturalLanguage)
    );

    await waitFor(() => {
      expect(mockgtag).toHaveBeenCalledWith(
        "event",
        GA_EVENT_PAGE_OVERVIEW_CLICK,
        {
          [GA_PARAM_CLICK_TRACKING_MODE]: GA_VALUE_INITIAL_CLICK,
        }
      );
    });
  });
  test("triggers GA event when Page Overview link is clicked twice", async () => {
    // Mock gtag
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Mock Flask route
    axios.post = jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: {
          pageOverview: PAGE_OVERVIEW,
          statVarChartLinks: STAT_VAR_CHART_LINKS,
        },
      })
    );

    // Render page overview component
    const pageOverview = render(
      <ThemeProvider theme={theme}>
        <PageOverview {...PAGE_OVERVIEW_PROPS} />
      </ThemeProvider>
    );

    // Wait for overview to render
    await waitForElementToBeRemoved(pageOverview.getByText("Loading..."));

    // Click scroll link
    fireEvent.click(
      pageOverview.getByText(STAT_VAR_CHART_LINKS[0].naturalLanguage)
    );

    await waitFor(() => {
      expect(mockgtag).toHaveBeenCalledWith(
        "event",
        GA_EVENT_PAGE_OVERVIEW_CLICK,
        {
          [GA_PARAM_CLICK_TRACKING_MODE]: GA_VALUE_TOTAL_CLICKS,
        }
      );
    });

    // Click scroll link
    fireEvent.click(
      pageOverview.getByText(STAT_VAR_CHART_LINKS[1].naturalLanguage)
    );

    await waitFor(() => {
      expect(mockgtag).toHaveBeenNthCalledWith(
        4,
        "event",
        GA_EVENT_PAGE_OVERVIEW_CLICK,
        {
          [GA_PARAM_CLICK_TRACKING_MODE]: GA_VALUE_TOTAL_CLICKS,
        }
      );
    });
  });
  test("triggers GA event when Page Overview loads counting anchor elements", async () => {
    // Mock gtag
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // Mock Flask route
    axios.post = jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: {
          pageOverview: PAGE_OVERVIEW,
          statVarChartLinks: STAT_VAR_CHART_LINKS,
        },
      })
    );

    // Render page overview component
    const pageOverview = render(
      <ThemeProvider theme={theme}>
        <PageOverview {...PAGE_OVERVIEW_PROPS} />
      </ThemeProvider>
    );

    // Wait for overview to render
    await waitForElementToBeRemoved(pageOverview.getByText("Loading..."));

    await waitFor(() => {
      expect(mockgtag).toHaveBeenCalledWith(
        "event",
        GA_EVENT_TOTAL_ANCHOR_COUNT,
        {
          [GA_PARAM_PAGE_SOURCE]: GA_VALUE_PAGE_EXPLORE,
          [GA_PARAM_COMPONENT]: GA_VALUE_PAGE_OVERVIEW,
          [GA_PARAM_COUNT_ANCHOR_ELEMENTS]: "3",
        }
      );
    });
  });
});
