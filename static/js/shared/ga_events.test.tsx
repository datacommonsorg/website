jest.mock("axios");
jest.mock("../chart/draw_choropleth");
jest.mock("../chart/draw_scatter");
jest.mock("../chart/draw", () => {
  const originalModule = jest.requireActual("../chart/draw");
  return {
    __esModule: true,
    ...originalModule,
    drawGroupBarChart: jest.fn(),
    drawGroupLineChart: jest.fn(),
    drawHistogram: jest.fn(),
    drawLineChart: jest.fn(),
    drawStackBarChart: jest.fn(),
    wrap: jest.fn(),
  };
});

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import axios from "axios";
import React from "react";
import { IntlProvider } from "react-intl";

import { getColorFn } from "../chart/base";
import { appendLegendElem } from "../chart/draw";
import { chartTypeEnum, GeoJsonData, MapPoint } from "../chart/types";
import { Chart as PlaceChart } from "../place/chart";
import { ChartHeader } from "../place/chart_header";
import { Menu } from "../place/menu";
import { Chart as MapToolChart } from "../tools/map/chart";
import {
  DisplayOptionsWrapper as MapDisplayOptionsWrapper,
  StatVarWrapper,
} from "../tools/map/context";
import { DataPointMetadata } from "../tools/map/util";
import { Chart as ScatterToolChart } from "../tools/scatter/chart";
import {
  AxisWrapper,
  Context,
  DisplayOptionsWrapper as ScatterDisplayOptionsWrapper,
  IsLoadingWrapper,
  PlaceInfoWrapper,
} from "../tools/scatter/context";
import { ScatterChartType } from "../tools/scatter/util";
import { Chart as TimelineToolChart } from "../tools/timeline/chart";
import * as dataFetcher from "../tools/timeline/data_fetcher";
import {
  GA_EVENT_PLACE_CATEGORY_CLICK,
  GA_EVENT_PLACE_CHART_CLICK,
  GA_EVENT_TOOL_CHART_PLOT,
  GA_PARAM_PLACE_CATEGORY_CLICK,
  GA_PARAM_PLACE_CATEGORY_CLICK_SOURCE,
  GA_PARAM_PLACE_CHART_CLICK,
  GA_PARAM_PLACE_DCID,
  GA_PARAM_STAT_VAR,
  GA_VALUE_PLACE_CATEGORY_CLICK_SOURCE_CHART_HEADER,
  GA_VALUE_PLACE_CATEGORY_CLICK_SOURCE_MORE_CHARTS,
  GA_VALUE_PLACE_CATEGORY_CLICK_SOURCE_SIDEBAR,
  GA_VALUE_PLACE_CHART_CLICK_DATA_SOURCE,
  GA_VALUE_PLACE_CHART_CLICK_EXPLORE_MORE,
  GA_VALUE_PLACE_CHART_CLICK_EXPORT,
  GA_VALUE_PLACE_CHART_CLICK_STAT_VAR_CHIP,
} from "./ga_events";
import { StatVarInfo } from "./stat_var";

const CATEGORY = "Economics";
const PLACE_DCID = "geoId/05";
const PLACE_NAME = "Arkansas";
const STAT_VAR_1 = "Median_Income_Household";
const STAT_VAR_2 = "Median_Age_Person";
const STAT_VAR_3 = "Count_Person";
const SOURCES = "sources";
const ID = "a";
const NUMBER = 123;

// Props for place explorer chart.
const PLACE_CHART_PROPS = {
  category: CATEGORY,
  chartType: chartTypeEnum.LINE,
  dcid: PLACE_DCID,
  id: "",
  isUsaPlace: true,
  names: { [PLACE_DCID]: PLACE_NAME },
  rankingTemplateUrl: "",
  statsVars: [STAT_VAR_1],
  title: "",
  trend: { exploreUrl: "", series: {}, sources: [SOURCES] },
  unit: "",
};

// Props for map tool chart.
const MAP_POINTS: MapPoint[] = [
  {
    latitude: NUMBER,
    longitude: NUMBER,
    placeDcid: PLACE_DCID,
    placeName: PLACE_NAME,
  },
];
const MAP_POINTS_PROMISE: Promise<MapPoint[]> = new Promise(() => MAP_POINTS);
const MAP_PROPS = {
  breadcrumbDataValues: { PLACE_DCID: NUMBER },
  dates: new Set<string>([""]),
  display: {
    value: {
      color: "",
      domain: [NUMBER, NUMBER, NUMBER] as [number, number, number],
      showMapPoints: false,
      showTimeSlider: false,
    },
  } as MapDisplayOptionsWrapper,
  geoJsonData: {
    features: [],
    properties: {
      current_geo: PLACE_DCID,
    },
    type: "FeatureCollection",
  } as GeoJsonData,
  mapDataValues: { [PLACE_DCID]: NUMBER },
  metadata: { [PLACE_DCID]: {} as DataPointMetadata },
  placeInfo: {
    enclosedPlaceType: "",
    enclosingPlace: { dcid: PLACE_DCID, name: PLACE_NAME },
    mapPointPlaceType: "",
    parentPlaces: [],
    selectedPlace: { dcid: PLACE_DCID, name: PLACE_NAME, types: [] },
  },
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
  sources: new Set<string>([""]),
  unit: "",
  mapPointValues: { [PLACE_DCID]: NUMBER },
  mapPointsPromise: MAP_POINTS_PROMISE,
  europeanCountries: [],
  rankingLink: "",
  facetInfo: {
    dcid: STAT_VAR_1,
    displayNames: {},
    metadataMap: {},
    name: STAT_VAR_1,
  },
  sampleDates: [],
  metahash: "",
  onPlay: () => null,
  updateDate: () => null,
};

// Props for timeline tool chart.
const TIMELINE_PROPS = {
  denom: "",
  delta: false,
  mprop: "",
  onDataUpdate: () => null,
  onMetadataMapUpdate: () => null,
  placeNames: { [PLACE_DCID]: PLACE_NAME },
  pc: false,
  removeStatVar: () => null,
  statVarInfos: { [STAT_VAR_1]: { title: "" } } as Record<string, StatVarInfo>,
  svFacetId: { [STAT_VAR_1]: "" },
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
  onSvFacetIdUpdated: () => null,
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
      lowerBound: NUMBER,
      upperBound: NUMBER,
    },
  } as PlaceInfoWrapper,
  display: {
    showQuadrants: false,
    showLabels: false,
    chartType: ScatterChartType.SCATTER,
    showDensity: false,
    showRegression: false,
    setQuadrants: () => null,
    setLabels: () => null,
    setChartType: () => null,
    setDensity: () => null,
    setRegression: () => null,
  } as ScatterDisplayOptionsWrapper,
  isLoading: {} as IsLoadingWrapper,
};

beforeEach(() =>
  jest.spyOn(axios, "get").mockImplementation(() => Promise.resolve(null))
);

// Unmount react trees that were mounted with render and clear all mocks.
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("test ga event place category click", () => {
  test("call gtag when place category is clicked in the sidebar", async () => {
    // Mock gtag and render the component.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;
    const menu = render(
      <Menu
        categories={{
          Economics: CATEGORY,
        }}
        dcid={PLACE_DCID}
        selectCategory={CATEGORY}
        pageChart={{ Economics: { "": [] } }}
      ></Menu>
    );
    // Prevent window navigation.
    const category = menu.getByText(CATEGORY);
    category.addEventListener(
      "click",
      (event) => event.preventDefault(),
      false
    );
    // Click the category in the sidebar.
    fireEvent.click(category);
    await waitFor(() => {
      // Check the parameters passed to gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_PLACE_CATEGORY_CLICK,
        {
          [GA_PARAM_PLACE_CATEGORY_CLICK]: CATEGORY,
          [GA_PARAM_PLACE_CATEGORY_CLICK_SOURCE]:
            GA_VALUE_PLACE_CATEGORY_CLICK_SOURCE_SIDEBAR,
        },
      ]);
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(1);
    });
  });
  test("call gtag when place category is clicked from chart header", async () => {
    // Mock gtag and render the component.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;
    const chartHeader = render(
      <ChartHeader
        text={CATEGORY}
        place={PLACE_DCID}
        isOverview={true}
        categoryStrings={{
          Economics: CATEGORY,
        }}
      ></ChartHeader>
    );
    // Prevent window navigation.
    const category = chartHeader.getByText(CATEGORY);
    category.addEventListener(
      "click",
      (event) => event.preventDefault(),
      false
    );
    // Click the category in the chart header.
    fireEvent.click(category);
    await waitFor(() => {
      // Check the parameters passed to gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_PLACE_CATEGORY_CLICK,
        {
          [GA_PARAM_PLACE_CATEGORY_CLICK]: CATEGORY,
          [GA_PARAM_PLACE_CATEGORY_CLICK_SOURCE]:
            GA_VALUE_PLACE_CATEGORY_CLICK_SOURCE_CHART_HEADER,
        },
      ]);
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(1);
    });
  });
  test("call gtag when place category is clicked from more charts", async () => {
    // Mock gtag and render the component.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;
    const chartHeader = render(
      <ChartHeader
        text={CATEGORY}
        place={PLACE_DCID}
        isOverview={true}
        categoryStrings={{
          Economics: CATEGORY,
        }}
      ></ChartHeader>
    );
    // Prevent window navigation.
    const category = chartHeader.getByText("More charts ›");
    category.addEventListener(
      "click",
      (event) => event.preventDefault(),
      false
    );
    // Click more charts.
    fireEvent.click(category);
    await waitFor(() => {
      // Check the parameters passed to gtag.
      expect(mockgtag.mock.calls).toContainEqual([
        "event",
        GA_EVENT_PLACE_CATEGORY_CLICK,
        {
          [GA_PARAM_PLACE_CATEGORY_CLICK]: CATEGORY,
          [GA_PARAM_PLACE_CATEGORY_CLICK_SOURCE]:
            GA_VALUE_PLACE_CATEGORY_CLICK_SOURCE_MORE_CHARTS,
        },
      ]);
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(1);
    });
  });
});

describe("test ga event place chart click", () => {
  test("call gtag when place chart is clicked", async () => {
    // Mock gtag and render the component.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;
    const chart = render(
      <IntlProvider locale="en">
        <PlaceChart {...PLACE_CHART_PROPS} />
      </IntlProvider>
    );
    // Prevent window navigation.
    const chartSource = chart.getByText(SOURCES);
    chartSource.addEventListener(
      "click",
      (event) => event.preventDefault(),
      false
    );
    // Click data sources.
    fireEvent.click(chartSource);
    await waitFor(() => {
      // Check the parameters passed to gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_PLACE_CHART_CLICK,
        {
          [GA_PARAM_PLACE_CHART_CLICK]: GA_VALUE_PLACE_CHART_CLICK_DATA_SOURCE,
        },
      ]);
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(1);
    });
    // Prevent window navigation.
    const chartExport = chart.getByText("Export");
    chartExport.addEventListener(
      "click",
      (event) => event.preventDefault(),
      false
    );
    // Click export.
    fireEvent.click(chartExport);
    await waitFor(() => {
      // Check the parameters passed to gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_PLACE_CHART_CLICK,
        {
          [GA_PARAM_PLACE_CHART_CLICK]: GA_VALUE_PLACE_CHART_CLICK_EXPORT,
        },
      ]);
      // Check gtag is called once, two times in total.
      expect(mockgtag.mock.calls.length).toEqual(2);
    });
    // Prevent window navigation.
    const chartExplore = chart.getByText("Explore More ›");
    chartExplore.addEventListener(
      "click",
      (event) => event.preventDefault(),
      false
    );
    // Click exlore more.
    fireEvent.click(chartExplore);
    await waitFor(() => {
      // Check the parameters passed to gtag.
      expect(mockgtag.mock.calls).toContainEqual([
        "event",
        GA_EVENT_PLACE_CHART_CLICK,
        {
          [GA_PARAM_PLACE_CHART_CLICK]: GA_VALUE_PLACE_CHART_CLICK_EXPLORE_MORE,
        },
      ]);
      // Check gtag is called once, three times in total.
      expect(mockgtag.mock.calls.length).toEqual(3);
    });

    //Render the component.
    const statVarChip = render(<div id={ID} />);
    appendLegendElem(ID, getColorFn([""]), [{ label: STAT_VAR_1 }]);
    // Prevent window navigation.
    const chartStatVarChip = statVarChip.getByText(STAT_VAR_1);
    chartStatVarChip.addEventListener(
      "click",
      (event) => event.preventDefault(),
      false
    );
    // Click the stat var chip.
    fireEvent.click(chartStatVarChip);
    await waitFor(() => {
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.calls).toContainEqual([
        "event",
        GA_EVENT_PLACE_CHART_CLICK,
        {
          [GA_PARAM_PLACE_CHART_CLICK]:
            GA_VALUE_PLACE_CHART_CLICK_STAT_VAR_CHIP,
        },
      ]);
      // Check gtag is called once, four times in total.
      expect(mockgtag.mock.calls.length).toEqual(4);
    });
  });
});

describe("test ga event tool chart plot", () => {
  test("call gtag when a map tool chart is mounted or updated with different stat vars or places", async () => {
    // Mock gtag.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // When the component is mounted.
    const { rerender } = render(<MapToolChart {...MAP_PROPS} />);
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
    rerender(<MapToolChart {...MAP_PROPS} />);
    await waitFor(() =>
      // Check gtag is not called.
      expect(mockgtag.mock.calls.length).toEqual(1)
    );

    // When stat var changes.
    MAP_PROPS.statVar.value.dcid = STAT_VAR_2;
    rerender(<MapToolChart {...MAP_PROPS} />);
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
    const { rerender } = render(<TimelineToolChart {...TIMELINE_PROPS} />);
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
    rerender(<TimelineToolChart {...TIMELINE_PROPS} />);
    await waitFor(() =>
      // Check gtag is called.
      expect(mockgtag.mock.calls.length).toEqual(1)
    );

    // When stat var changes.
    TIMELINE_PROPS.statVarInfos = { [STAT_VAR_2]: { title: null } };
    rerender(<TimelineToolChart {...TIMELINE_PROPS} />);
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
      <Context.Provider value={SCATTER_CONTEXT}>
        <ScatterToolChart {...SCATTER_PROPS} />
      </Context.Provider>
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
      <Context.Provider value={SCATTER_CONTEXT}>
        <ScatterToolChart {...SCATTER_PROPS} />
      </Context.Provider>
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
      <Context.Provider value={SCATTER_CONTEXT}>
        <ScatterToolChart {...SCATTER_PROPS} />
      </Context.Provider>
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
