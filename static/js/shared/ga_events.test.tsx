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

// Unmount react trees that were mounted with render.
afterEach(() => {
  cleanup();
});

jest.spyOn(axios, "get").mockImplementation(() => Promise.resolve(null));
jest
  .spyOn(dataFetcher, "fetchRawData")
  .mockImplementation(() => Promise.resolve(null));

describe("test ga event place category click", () => {
  test("call gtag when place category is clicked in the sidebar", async () => {
    // Mock gtag and render the component.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;
    const menu = render(
      <Menu
        categories={{
          Economics: "Economics",
          Health: "Health",
          Overview: "Overview",
        }}
        dcid="geoId/1714000"
        selectCategory="Overview"
        pageChart={{ Economics: { "": [] } }}
      ></Menu>
    );
    // Prevent window navigation.
    const category = menu.getByText("Economics");
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
          [GA_PARAM_PLACE_CATEGORY_CLICK]: "Economics",
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
        text="Economics"
        place="geoId/06"
        isOverview={true}
        categoryStrings={{
          Overview: "Overview",
          Economics: "Economics",
          Health: "Health",
        }}
      ></ChartHeader>
    );
    // Prevent window navigation.
    const category = chartHeader.getByText("Economics");
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
          [GA_PARAM_PLACE_CATEGORY_CLICK]: "Economics",
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
        text="Economics"
        place="geoId/06"
        isOverview={true}
        categoryStrings={{
          Overview: "Overview",
          Economics: "Economics",
          Health: "Health",
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
          [GA_PARAM_PLACE_CATEGORY_CLICK]: "Economics",
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
  const props = {
    category: "Economics",
    chartType: chartTypeEnum.LINE,
    dcid: "geoId/06",
    id: "123",
    isUsaPlace: true,
    names: { "geoId/06": "California" },
    rankingTemplateUrl: "/ranking/_sv_/State/country/USA",
    statsVars: ["Stat var"],
    title: "title",
    trend: { exploreUrl: "", series: {}, sources: ["sources"] },
    unit: "",
  };
  test("call gtag when place chart is clicked", async () => {
    // Mock gtag and render the component.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;
    const chart = render(
      <IntlProvider locale="en">
        <PlaceChart {...props} />
      </IntlProvider>
    );
    // Prevent window navigation.
    const chartSource = chart.getByText("sources");
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
      // Check gtag is called once.
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
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(3);
    });

    //Render the component.
    const statVarChip = render(<div id="a" />);
    appendLegendElem("a", getColorFn([""]), [{ label: "Stat var chip" }]);
    // Prevent window navigation.
    const chartStatVarChip = statVarChip.getByText("Stat var chip");
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
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(4);
    });
  });
});

describe("test ga event tool chart plot", () => {
  test("call gtag when a map tool chart is mounted or updated with different stat vars or places", async () => {
    const mapPoints: MapPoint[] = [
      {
        latitude: 123,
        longitude: 123,
        placeDcid: "geoId/06",
        placeName: "California",
      },
    ];
    const mapPointsPromise: Promise<MapPoint[]> = new Promise(() => mapPoints);
    const props = {
      breadcrumbDataValues: { "geoId/06": 123 },
      dates: new Set<string>(["2022"]),
      display: {
        value: {
          color: "",
          domain: [1, 2, 3] as [number, number, number],
          showMapPoints: false,
          showTimeSlider: false,
        },
      } as MapDisplayOptionsWrapper,
      geoJsonData: {
        features: [],
        properties: {
          current_geo: "geoId/06",
        },
        type: "FeatureCollection",
      } as GeoJsonData,
      mapDataValues: { "geoId/06": 123 },
      metadata: { "geoId/06": {} as DataPointMetadata },
      placeInfo: {
        enclosedPlaceType: "County",
        enclosingPlace: { dcid: "geoId/06", name: "California" },
        mapPointPlaceType: "",
        parentPlaces: [],
        selectedPlace: { dcid: "geoId/06", name: "California", types: [] },
      },
      statVar: {
        value: {
          date: "",
          dcid: "Median_Age_Person",
          denom: "",
          info: {},
          mapPointSv: "",
          metahash: "",
          perCapita: false,
        },
      } as StatVarWrapper,
      sources: new Set<string>(["sources"]),
      unit: "",
      mapPointValues: { "geoId/06": 123 },
      mapPointsPromise,
      europeanCountries: [],
      rankingLink: "",
      facetInfo: {
        dcid: "Median_Age_Person",
        displayNames: {},
        metadataMap: {},
        name: "Median_Age_Person",
      },
      sampleDates: [],
      metahash: "",
      onPlay: () => null,
      updateDate: () => null,
    };

    // Mock gtag.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // When the component is mounted.
    const { rerender } = render(<MapToolChart {...props} />);
    await waitFor(() => {
      // Check the parameters passed to gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_PLOT,
        {
          [GA_PARAM_STAT_VAR]: "Median_Age_Person",
          [GA_PARAM_PLACE_DCID]: "geoId/06",
        },
      ]);
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(1);
    });

    // When the component is rerendered with the same props.
    rerender(<MapToolChart {...props} />);
    await waitFor(() =>
      // Check gtag is not called.
      expect(mockgtag.mock.calls.length).toEqual(1)
    );

    // When stat var changes.
    props.statVar.value.dcid = "abc";
    rerender(<MapToolChart {...props} />);
    await waitFor(() => {
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(2);
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.calls).toContainEqual([
        "event",
        GA_EVENT_TOOL_CHART_PLOT,
        {
          [GA_PARAM_STAT_VAR]: "abc",
          [GA_PARAM_PLACE_DCID]: "geoId/06",
        },
      ]);
    });
  });
  test("call gtag when a timeline tool chart is mounted or updated with different stat vars or places ", async () => {
    const props = {
      denom: "",
      delta: false,
      mprop: "income",
      onDataUpdate: () => null,
      onMetadataMapUpdate: () => null,
      placeNames: { "geoId/06": "California" },
      pc: false,
      removeStatVar: () => null,
      statVarInfos: { Median_Income_Household: { title: "" } } as Record<
        string,
        StatVarInfo
      >,
      svFacetId: { Median_Income_Household: "" },
    };

    // Mock gtag.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;

    // When the component is mounted.
    const { rerender } = render(<TimelineToolChart {...props} />);
    await waitFor(() => {
      // Check the parameters passed to gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_PLOT,
        {
          [GA_PARAM_STAT_VAR]: ["Median_Income_Household"],
          [GA_PARAM_PLACE_DCID]: ["geoId/06"],
        },
      ]);
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(1);
    });

    // When the component is rerendered with the same props.
    rerender(<TimelineToolChart {...props} />);
    await waitFor(() =>
      // Check gtag is called.
      expect(mockgtag.mock.calls.length).toEqual(1)
    );

    // When stat var changes.
    props.statVarInfos = { abc: { title: null } };
    rerender(<TimelineToolChart {...props} />);
    await waitFor(() => {
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(2);
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_PLOT,
        {
          [GA_PARAM_STAT_VAR]: ["abc"],
          [GA_PARAM_PLACE_DCID]: ["geoId/06"],
        },
      ]);
    });
  });
  test("call gtag when a scatter tool chart is mounted or updated with different stat vars or places ", async () => {
    const props = {
      points: {
        "geoId/06": {
          place: { name: "", dcid: "" },
          xVal: 123,
          xDate: "2022",
          yVal: 123,
          yDate: "2022",
        },
      },
      xLabel: "Median_Income_Household",
      xLog: false,
      xPerCapita: false,
      yLabel: "Age",
      yLog: false,
      yPerCapita: false,
      placeInfo: {
        enclosingPlace: { dcid: "geoId/06", name: "California", types: [] },
        enclosedPlaceType: "",
        enclosedPlaces: [],
        parentPlaces: [],
        lowerBound: 123,
        upperBound: 123,
      },
      display: {
        showQuadrants: false,
        showLabels: false,
        chartType: ScatterChartType.SCATTER,
        showDensity: false,
        showRegression: false,
      } as ScatterDisplayOptionsWrapper,
      sources: new Set<string>(["sources"]),
      svFacetId: { Median_Income_Household: "" },
      facetList: [
        {
          dcid: "Median_Income_Household",
          name: "Median_Income_Household",
          metadataMap: {},
        },
        {
          dcid: "Age",
          name: "Age",
          metadataMap: {},
        },
      ],
      onSvFacetIdUpdated: () => null,
    };
    const context = {
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
      } as AxisWrapper,
      place: {
        value: {
          enclosingPlace: { dcid: "geoId/06", name: "California", types: [] },
          enclosedPlaceType: "",
          enclosedPlaces: [],
          parentPlaces: [],
          lowerBound: 123,
          upperBound: 123,
        },
      } as PlaceInfoWrapper,
      display: {} as ScatterDisplayOptionsWrapper,
      isLoading: {} as IsLoadingWrapper,
    };
    // Mock gtag.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;
    // When the component is mounted.
    const { rerender } = render(
      <Context.Provider value={context}>
        <ScatterToolChart {...props} />
      </Context.Provider>
    );
    await waitFor(() => {
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_PLOT,
        {
          [GA_PARAM_STAT_VAR]: ["Median_Income_Household", "Age"],
          [GA_PARAM_PLACE_DCID]: "geoId/06",
        },
      ]);
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(1);
    });
    // When the component is rerendered with the same props.
    rerender(
      <Context.Provider value={context}>
        <ScatterToolChart {...props} />
      </Context.Provider>
    );
    await waitFor(() =>
      // Check gtag is not called.
      expect(mockgtag.mock.calls.length).toEqual(1)
    );
    // When stat var changes.
    props.facetList = [
      {
        dcid: "abc",
        name: "abc",
        metadataMap: {},
      },
      {
        dcid: "Age",
        name: "Age",
        metadataMap: {},
      },
    ];
    rerender(
      <Context.Provider value={context}>
        <ScatterToolChart {...props} />
      </Context.Provider>
    );
    await waitFor(() => {
      // Check gtag is called once.
      expect(mockgtag.mock.calls.length).toEqual(2);
      // Check the parameters passed to the gtag.
      expect(mockgtag.mock.lastCall).toEqual([
        "event",
        GA_EVENT_TOOL_CHART_PLOT,
        {
          [GA_PARAM_STAT_VAR]: ["abc", "Age"],
          [GA_PARAM_PLACE_DCID]: "geoId/06",
        },
      ]);
    });
  });
});
