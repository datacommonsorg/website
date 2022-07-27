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
  PlaceInfo,
  PlaceInfoWrapper,
} from "../tools/scatter/context";
import { ScatterChartType } from "../tools/scatter/util";
import { Chart as TimelineToolChart } from "../tools/timeline/chart";
import * as data_fetcher from "../tools/timeline/data_fetcher";
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
  .spyOn(data_fetcher, "fetchRawData")
  .mockImplementation(() => Promise.resolve(null));

describe("test ga event place category click", () => {
  test("call gtag when place category is clicked in the sidebar", async () => {
    // Mock gtag and render the component.
    const mockgtag = jest.fn();
    window.gtag = mockgtag;
    const menu = render(
      <Menu
        categories={{
          Overview: "Overview",
          Economics: "Economics",
          Health: "Health",
        }}
        dcid="geoId/1714000"
        selectCategory="Overview"
        pageChart={{ Economics: { "": [] } }}
      ></Menu>
    );
    // Click the category in the sidebar.
    fireEvent.click(menu.getByText("Economics"));
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
    // Click the category in the chart header.
    fireEvent.click(chartHeader.getByText("Economics"));
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
    // Click more charts.
    fireEvent.click(chartHeader.getByText("More charts ›"));
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
    id: "123",
    dcid: "geoId/06",
    chartType: chartTypeEnum.LINE,
    trend: { exploreUrl: "", series: {}, sources: ["sources"] },
    title: "title",
    statsVars: ["Stat var"],
    category: "Economics",
    isUsaPlace: true,
    rankingTemplateUrl: "/ranking/_sv_/State/country/USA",
    names: { "geoId/06": "California" },
    unit: null,
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
    // Click data sources.
    fireEvent.click(chart.getByText("sources"));
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

    // Click export.
    fireEvent.click(chart.getByText("Export"));
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

    // Click exlore more.
    fireEvent.click(chart.getByText("Explore More ›"));
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

    //Render the component and click stat var chip
    const statVarChip = render(<div id="a" />);
    appendLegendElem("a", getColorFn([""]), [{ label: "Stat var chip" }]);
    // Click the stat var chip.
    fireEvent.click(statVarChip.getByText("Stat var chip"));
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
        placeDcid: "geoId/06",
        placeName: "California",
        latitude: 123,
        longitude: 123,
      },
    ];
    const mapPointsPromise: Promise<MapPoint[]> = new Promise(() => mapPoints);
    const props = {
      geoJsonData: {
        type: "FeatureCollection",
        features: [],
        properties: {
          current_geo: "geoId/06",
        },
      } as GeoJsonData,
      mapDataValues: { "geoId/06": 123 },
      metadata: { "geoId/06": {} as DataPointMetadata },
      breadcrumbDataValues: { "geoId/06": 123 },
      placeInfo: {
        selectedPlace: { dcid: "geoId/06", name: "California", types: [] },
        enclosingPlace: { dcid: "geoId/06", name: "California" },
        enclosedPlaceType: "County",
        parentPlaces: [],
        mapPointPlaceType: "",
      },
      statVar: {
        value: {
          dcid: "Median_Age_Person",
          perCapita: false,
          info: {},
          date: "",
          denom: "",
          mapPointSv: "",
          metahash: "",
        },
      } as StatVarWrapper,
      dates: new Set<string>(["2022"]),
      sources: new Set<string>(["sources"]),
      unit: "",
      mapPointValues: { "geoId/06": 123 },
      mapPointsPromise,
      display: {
        value: {
          color: "",
          domain: [1, 2, 3] as [number, number, number],
          showMapPoints: false,
          showTimeSlider: false,
        },
      } as MapDisplayOptionsWrapper,
      europeanCountries: [],
      rankingLink: "",
      facetInfo: {
        dcid: "Median_Age_Person",
        name: "Median_Age_Person",
        metadataMap: {},
        displayNames: {},
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
      mprop: "income",
      placeNames: { "geoId/06": "California" },
      statVarInfos: { Median_Income_Household: { title: "" } } as Record<
        string,
        StatVarInfo
      >,
      pc: false,
      denom: "",
      delta: false,
      onDataUpdate: () => null,
      removeStatVar: () => null,
      svFacetId: { Median_Income_Household: "" },
      onMetadataMapUpdate: () => null,
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
          yVal: 123,
          xDate: "2022",
          yDate: "2022",
        },
      },
      xLabel: "Median_Income_Household",
      yLabel: "Age",
      xLog: false,
      yLog: false,
      xPerCapita: false,
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
