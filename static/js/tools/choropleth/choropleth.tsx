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
 * Creates and manages choropleth rendering.
 */
import React, { Component } from "react";
import axios from "axios";
import * as d3 from "d3";
import ReactDOM from "react-dom";
import { GeoJsonData, GeoJsonFeature } from "../../chart/types";
import _ from "lodash";
import { loadLocaleData } from "../../i18n/i18n";

const TOOLTIP_ID = "tooltip";
const LEGEND_HEIGHT = 60;
const LATEST_DATE = "latest";
const MAP_PADDING = 7;
const LEGEND_WIDTH = 300;
const TICK_SIZE = 6;
const NUM_TICKS = 5;
const LEGEND_MARGIN_TOP = 18;
const LEGEND_MARGIN_BOTTOM = 16 + TICK_SIZE;
const LEGEND_MARGIN_SIDES = 25;
const LEGEND_TEXT_PADDING = 6;
// TODO: Bring in logic from timelines tool for stat var title
const NAME_REPLACEMENT_DICT = {
  "Count Person": "Population",
  "Count Worker": "Workers in",
  "Count Household": "Households with",
  Person: "",
};
const BREADCRUMB_NAME_SEPARATOR = "~";

type PropsType = unknown;

type BreadCrumbType = {
  geoId: string;
  geoName: string;
};

// TODO(eduardo): get rid of "unknown" type.
type StateType = {
  geoJson: GeoJsonData;
  values: { [geoId: string]: number };
  data: { [geoId: string]: { [date: string]: number } };
  date: string;
  mapContent: unknown;
  pc: boolean;
  popMap: { [geoId: string]: number };
  breadCrumbs: BreadCrumbType[];
};

class ChoroplethMap extends Component<PropsType, StateType> {
  svgContainerElement: React.RefObject<HTMLDivElement>;
  constructor(props: PropsType) {
    super(props);
    const locale = "en";
    loadLocaleData(locale, [
      import(`../../i18n/compiled-lang/${locale}/stats_var_labels.json`),
    ]);
    this.svgContainerElement = React.createRef();
    const urlParams = new URLSearchParams(window.location.search);
    const isPerCapita =
      urlParams.has("pc") &&
      ["t", "true", "1"].includes(urlParams.get("pc").toLowerCase());
    this.state = {
      geoJson: null,
      data: {},
      date: LATEST_DATE,
      mapContent: {} as any,
      pc: isPerCapita,
      popMap: {},
      values: {},
      breadCrumbs: [],
    };
    this._handleWindowResize = this._handleWindowResize.bind(this);
  }

  public componentWillUnmount(): void {
    window.removeEventListener("resize", this._handleWindowResize);
  }

  public componentDidMount = (): void => {
    window.addEventListener("resize", this._handleWindowResize);
    this.loadGeoJson("");
  };

  private _handleWindowResize = (): void => {
    this.drawBlankGeoMap();
    this.addColorToGeoMap();
  };

  /**
   * Loads and renders blank GeoJson map for current geoDcid.
   * After loading, values for a particular StatVar are pulled.
   */
  private loadGeoJson = (geoName: string): void => {
    let geoUrl = "/api/choropleth/geo";
    geoUrl += buildChoroplethParams(["pc", "geoDcid", "level", "mdom"]);
    let valueUrl = "/api/choropleth/values";
    valueUrl += buildChoroplethParams(["geoDcid", "statVar", "level"]);
    if (geoName) {
      /* XSS
      const searchParams = new URLSearchParams(window.location.search);
      updateTitle(searchParams.get("statVar"), geoName);
      showLoading();
      */
    }

    // Create request and generate map.
    const geoPromise = axios.get(geoUrl);
    const valuePromise = axios.get(valueUrl);
    Promise.all([geoPromise, valuePromise]).then(
      (values) => {
        // Coordinates for the map.
        const geoJson = values[0].data[0];
        // All the timeseries data for all places.
        const data = values[1].data[0];
        // The latest value for all places.
        const geoIdToValues = this.filterByDate(data, LATEST_DATE);

        this.setState({
          geoJson: geoJson,
          values: geoIdToValues,
          data: data,
        });

        //TODO(iancostello): Investigate if this can be moved to
        //shouldComponentUpdate.
        this.drawBlankGeoMap();
        this.addColorToGeoMap();
        removeLoading();
      },
      () => {
        document.getElementById("heading").innerHTML = "";
        document.getElementById("error").innerHTML =
          "API Request Failed! " +
          "Please consider starting at the base menu again." +
          '<a href="/tools/choropleth"> Access here.</a>';
        removeLoading();
      }
    );
  };

  /**
   * Loads values for the current geoDcid and updates map.
   */
  private loadValues = (): void => {
    let baseUrl = "/api/choropleth/values";
    baseUrl += buildChoroplethParams(["geoDcid", "level", "statVar"]);
    /* XSS
    const searchParams = new URLSearchParams(window.location.search);
    updateTitle(
      searchParams.get("statVar"),
      this.state.geoJson.properties.current_geo
    );
    */
    showLoading();

    axios.get(baseUrl).then(
      (resp) => {
        // Because this is the first time loading the page,
        // filter the value by "latest" date.
        const data = resp.data[0];
        const geoIdToValues = this.filterByDate(data, LATEST_DATE);

        // values contains only the data for the date being observed.
        // data contains the raw data.
        // In case the user wants to switch date xor data.
        this.setState({
          values: geoIdToValues,
          data: data,
        });

        this.addColorToGeoMap();
        removeLoading();
      },
      () => {
        document.getElementById("heading").innerHTML = "";
        document.getElementById("error").innerHTML =
          "API request failed for your" +
          "statistical variable choice! Please select a new variable.";
        removeLoading();
      }
    );
  };

  /**
   * Gets the latest date in a list of ISO 8601 dates.
   * @param dates: a list of dates in ISO 8601 format.
   * Example: "2020-01-02".
   */
  private getLatestDate = (dates: string[]): string => {
    if (!dates.length) {
      return "";
    }

    return dates.reduce((a, b) => {
      return new Date(a) >= new Date(b) ? a : b;
    });
  };

  /**
   * Set per capita on the state.
   */
  public setPerCapita = (pc: boolean): void => {
    // Wait for state to update before redrawing.
    this.setState({ pc }, this.addColorToGeoMap);
  };

  /**
   * Handles rendering the basic blank geoJson map.
   * Requires state geojson to be set with valid geoJson mapping object.
   */
  private drawBlankGeoMap = (): void => {
    // Combine path elements from D3 content.
    const geojson = this.state.geoJson;
    const container = document.getElementById("choropleth-body");
    const heading = document.getElementById("heading");
    const width = container.offsetWidth - MAP_PADDING * 2;
    const height =
      container.offsetHeight -
      heading.clientHeight -
      LEGEND_HEIGHT -
      MAP_PADDING * 2;
    if (!d3.select("#map-container").empty()) {
      d3.select("#map-container").remove();
    }
    const svg = d3
      .select("#svg-container")
      .attr("padding", `${MAP_PADDING}px`)
      .append("svg")
      .attr("id", "map-container")
      .attr("width", width)
      .attr("height", height);
    const map = svg.append("g").attr("class", "map");
    const mapContent = map.selectAll("path").data(geojson.features);

    // Scale and center the map.
    const projection = d3.geoAlbersUsa().fitSize([width, height], geojson);
    const geomap = d3.geoPath().projection(projection);
    // Build map objects.
    mapContent
      .enter()
      .append("path")
      .attr("d", geomap)
      .attr("class", "choropleth-region")
      .attr("fill", "gray")
      // Add various event handlers.
      .on("mouseover", this.handleMapHover)
      .on("mousemove", this.handleMouseMove)
      .on("mouseleave", this.mouseLeave)
      .on("click", this.handleMapClick);

    this.setState({ mapContent });

    // Create population map.
    const popMap = {};
    for (const index in geojson.features) {
      const content = geojson.features[index];
      popMap[content.id] = content.properties.pop;
    }

    this.setState(() => {
      return { popMap };
    });

    addTooltip();
  };

  /**
   * Updates geoJson map with current values loaded in state.
   * Requires blank geoJson map to be rendered and state values to be set.
   */
  private addColorToGeoMap = (): void => {
    const geoIdToValue = this.state["values"];
    const isPerCapita = this.state["pc"];
    const geoIdToPopulation = this.state["popMap"];

    // Build chart display options.
    const blues = [
      "#eef5fb",
      "#deebf7",
      "#c6dbef",
      "#9ecae1",
      "#6baed6",
      "#4292c6",
      "#2171b5",
      "#08519c",
      "#08306b",
    ];
    const colorVals = determineColorPalette(
      geoIdToValue,
      isPerCapita,
      geoIdToPopulation
    );

    const colorScale = d3
      .scaleLinear()
      .domain(colorVals)
      .range((blues as unknown) as number[]);

    // Select D3 paths via geojson data.
    const geojson = this.state["geoJson"];
    const mapContent = d3
      .select("#main-pane g.map")
      .selectAll("path")
      .data(geojson.features)
      .attr("id", (_, index) => {
        return "geoPath" + index;
      });

    // Create new infill.
    mapContent.attr("fill", (d: GeoJsonFeature) => {
      if (d.properties.geoDcid in geoIdToValue) {
        const value = geoIdToValue[d.properties.geoDcid];
        if (isPerCapita) {
          if (Object.prototype.hasOwnProperty.call(d.properties, "pop")) {
            return colorScale(value / d.properties.pop);
          }
          return "gray";
        }
        return colorScale(value);
      } else {
        return "gray";
      }
    });

    // Update title.
    // TODO(iancostello): Use react component instead of innerHTML throughout.
    /* XSS
    const url = new URL(window.location.href);
    const currentGeo = this.state["geoJson"]["properties"]["current_geo"];
    const currentStatVar = url.searchParams.get("statVar");
    if (currentStatVar) {
      updateTitle(currentStatVar, currentGeo);
    } else {
      document.getElementById("heading").innerHTML = currentGeo;
      document.getElementById("hover-text-display").innerHTML =
        "Pick a statistical variable to get started!";
    }
    */
    this.generateLegend(colorScale);
  };

  /**
   * Create a canvas object with a color gradient to be used as a color scale.
   * @param color  d3.scaleLinear object that encodes the desired color gradient.
   * @param n Number of color tones to transition between.
   */
  private genScaleImg = (
    color: d3.ScaleLinear<number, number>,
    n = 256
  ): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.width = n;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    for (let i = 0; i < n; ++i) {
      context.fillStyle = (color(i / (n - 1)) as unknown) as string;
      context.fillRect(i, 0, 1, 1);
    }
    return canvas;
  };

  /**
   * Draw a color scale legend.
   * @param color The d3 linearScale that encodes the color gradient to be
   *        plotted.
   */
  private generateLegend = (color: d3.ScaleLinear<number, number>): void => {
    const title = "Scale";

    // Remove previous legend if it exists and create new one.
    if (!d3.select("#legend").empty()) {
      d3.select("#legend > *").remove();
    }

    const svg = d3
      .select("#legend")
      .append("svg")
      .attr("width", LEGEND_WIDTH)
      .attr("height", LEGEND_HEIGHT);

    const n = Math.min(color.domain().length, color.range().length);

    svg
      .append("image")
      .attr("id", "legend-img")
      .attr("x", LEGEND_MARGIN_SIDES)
      .attr("y", LEGEND_MARGIN_TOP)
      .attr("width", LEGEND_WIDTH - 2 * LEGEND_MARGIN_SIDES)
      .attr("height", LEGEND_HEIGHT - LEGEND_MARGIN_TOP - LEGEND_MARGIN_BOTTOM)
      .attr("preserveAspectRatio", "none")
      .attr(
        "xlink:href",
        this.genScaleImg(
          color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))
        ).toDataURL()
      );

    const x = color
      .copy()
      .rangeRound(
        d3.quantize(
          d3.interpolate(
            LEGEND_MARGIN_SIDES,
            LEGEND_WIDTH - LEGEND_MARGIN_SIDES
          ),
          n
        )
      );

    const dom = color.domain();
    const tickValues = d3.range(NUM_TICKS).map((i) => {
      const index = Math.floor((i * (dom.length - 1)) / (NUM_TICKS - 1));
      return dom[index];
    });

    svg
      .append("g")
      .attr(
        "transform",
        `translate(0, ${LEGEND_HEIGHT - LEGEND_MARGIN_BOTTOM})`
      )
      .call(d3.axisBottom(x).tickSize(TICK_SIZE).tickValues(tickValues))
      .call((g) =>
        g
          .selectAll(".tick line")
          .attr("y1", LEGEND_MARGIN_TOP + LEGEND_MARGIN_BOTTOM - LEGEND_HEIGHT)
      )
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .append("text")
          .attr("x", LEGEND_MARGIN_SIDES)
          .attr(
            "y",
            LEGEND_MARGIN_TOP +
              LEGEND_MARGIN_BOTTOM -
              LEGEND_HEIGHT -
              LEGEND_TEXT_PADDING
          )
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .attr("font-weight", "bold")
          .text(title)
      );

    // Get the list of dates and create a dropdown so the user can select.
    const allDates: Set<string> = new Set();
    Object.entries(this.state.data)?.forEach(([, dateToValue]) => {
      const dates = Object.keys(dateToValue);
      dates.forEach((date) => {
        allDates.add(date);
      });
    });

    // Place the date dropdown on the screen.
    ReactDOM.render(
      <DatePicker
        dates={Array.from(allDates)}
        selectedDate={this.state.date}
        onSelectedDateChanged={this.onSelectedDateChanged}
      />,
      document.getElementById("date")
    );
  };

  /**
   * Changes the date and updates the values on the state.
   * This causes a re-render that makes the map be updated
   * to reflect the new data.
   * @param event: an 'onChange' event.
   */
  private onSelectedDateChanged = (event: {
    target: { value: string };
  }): void => {
    // Get the newly selected date as a string.
    const newDate: string = event.target.value;
    const data = this.state["data"];
    // Re-update this.values to only include data for that given date.
    const geoIdToValue = this.filterByDate(data, newDate);
    // Store the new date and the new values.
    this.setState({ date: newDate, values: geoIdToValue }, () => {
      // Re-render component and map.
      this.addColorToGeoMap();

      // TODO(edumorales): show the range of dates somewhere so that
      // the user knows what dates are being shown.
    });
  };

  /**
   *
   * @param values: the data in the form of geoId->date->value.
   * @param date: a date in ISO 8601 format string.
   * Example: "2020-01-02".
   */
  private filterByDate = (
    values: { [geoId: string]: { [date: string]: number } },
    date: string
  ): { [geoId: string]: number } => {
    const geoIdToValue = {};
    let realISOdate = date;

    Object.entries(values).forEach(([geoId, dateToValue]) => {
      // If the user wants to filter by "latest",
      // figure out what the latest date is.
      if (date === LATEST_DATE) {
        const dates = Object.keys(dateToValue);
        realISOdate = this.getLatestDate(dates);
      }

      // Store the value for that date.
      const value = dateToValue?.[realISOdate];
      if (value) {
        geoIdToValue[geoId] = value;
      }
    });

    return geoIdToValue;
  };

  /**
   * Updates the current map and URL to a new statistical variable without
   * a full page refresh.
   * @param statVar to update to.
   */
  public handleStatVarChange = (statVar: string): void => {
    // Update URL history.
    let baseUrl = "/tools/choropleth";
    baseUrl += buildChoroplethParams(["geoDcid", "bc", "pc", "level", "mdom"]);
    baseUrl += "&statVar=" + statVar;
    history.pushState({}, null, baseUrl);

    // TODO(iancostello): Manage through component's state.
    this.loadValues();
  };

  private handleMapHover = (geo: GeoJsonFeature, index: number): void => {
    // Highlight selected subgeos and change pointer if they are clickable.
    d3.select("#svg-container")
      .select("#geoPath" + index)
      .classed("highlighted", true)
      .classed("clickable", geo.properties.hasSublevel);
    // show tooltip
    d3.select("#svg-container")
      .select(`#${TOOLTIP_ID}`)
      .style("display", "block");
  };

  /**
   * Capture hover event on geo and displays relevant information.
   * @param {json} geo is the geoJson content for the hovered geo.
   */
  private handleMouseMove = (geo: GeoJsonFeature): void => {
    const name = geo.properties.name;
    const geoDcid = geo.properties.geoDcid;
    const values = this.state["values"];
    let geoValue: number | string = "No Value";
    if (geoDcid in values) {
      geoValue = values[geoDcid] as number;

      if (this.state["pc"]) {
        if (Object.prototype.hasOwnProperty.call(geo.properties, "pop")) {
          geoValue /= geo.properties.pop;
        }
      }
    }
    const tooltipSelect = d3.select("#svg-container").select(`#${TOOLTIP_ID}`);
    const text = name + ": " + formatGeoValue(geoValue, this.state["pc"]);
    const tooltipHeight = (tooltipSelect.node() as HTMLDivElement).clientHeight;
    const offset = 10;
    const leftOffset = offset;
    const topOffset = -tooltipHeight - offset;
    tooltipSelect
      .text(text)
      .style("left", d3.event.offsetX + leftOffset + "px")
      .style("top", d3.event.offsetY + topOffset + "px");
  };

  /**
   * Clears output after leaving a geo.
   */
  private mouseLeave = (_geo: GeoJsonFeature, index: number): void => {
    this.mouseOutAction(index);
  };

  private mouseOutAction = (index: number) => {
    const container = d3.select("#svg-container");
    container
      .select("#geoPath" + index)
      .classed("highlighted", false)
      .classed("clickable", false);
    container.select(`#${TOOLTIP_ID}`).style("display", "none");
  };

  /**
   * Capture click event on geo and zooms
   * user into that geo in the choropleth tool.
   * @param {json} geo is the geoJson content for the clicked geo.
   */
  private handleMapClick = (geo: GeoJsonFeature, index: number): void => {
    if (geo.properties.hasSublevel) {
      this.redirectToGeo(
        geo.properties.geoDcid,
        this.state["geoJson"]["properties"]["current_geo"]
      );
    } else {
      alert("This geo has no further sublevels!");
    }
    this.mouseOutAction(index);
  };

  /**
   * Redirects the webclient to a particular geo. Handles breadcrumbs in redirect.
   * @param {string} geoDcid to redirect to.
   * @param {string} curGeo human-readable current geo, e.g. United States when geoDcid
   *                 is country/USA.
   */
  private redirectToGeo = (geoDcid: string, curGeo: string): void => {
    const currGeoId = new URLSearchParams(window.location.search).get(
      "geoDcid"
    );
    let baseUrl = `/tools/choropleth${buildChoroplethParams([
      "statVar",
      "pc",
      "mdom",
    ])}&geoDcid=${geoDcid}&bc=`;

    const idxOfCurr = this.state.breadCrumbs.findIndex(
      (crumb) => crumb.geoId === geoDcid
    );
    let breadCrumbsList = this.state.breadCrumbs;
    let nextGeoName = "";
    if (idxOfCurr == -1) {
      breadCrumbsList.push({ geoId: currGeoId, geoName: curGeo });
      const nextGeoFeature = this.state.geoJson.features.find(
        (feature) => feature.properties.geoDcid === geoDcid
      );
      nextGeoName = nextGeoFeature ? nextGeoFeature.properties.name : "";
    } else {
      nextGeoName = breadCrumbsList[idxOfCurr].geoName;
      breadCrumbsList = breadCrumbsList.slice(0, idxOfCurr);
    }
    this.setState({
      breadCrumbs: breadCrumbsList,
    });
    for (let i = 0; i < breadCrumbsList.length; i++) {
      baseUrl += i === 0 ? "" : ";";
      baseUrl +=
        breadCrumbsList[i].geoId +
        BREADCRUMB_NAME_SEPARATOR +
        breadCrumbsList[i].geoName;
    }
    history.pushState({}, null, baseUrl);
    // Generate breadcrumbs.
    // TODO(fpernice-google): Derive the curGeo value from geoDcid instead
    // of embedding in url.
    this.generateBreadCrumbs(nextGeoName);
    this.loadGeoJson(nextGeoName);
  };

  /**
   * Generates the breadcrumbs text from browser url.
   * @param {string} curGeo human-readable current geo to display
   * at end of list of hierarchy of locations.
   * TODO: create separate breadcrumbs component and use that instead
   */
  private generateBreadCrumbs = (curGeo: string): void => {
    const url = new URL(window.location.href);
    const breadcrumbs = url.searchParams.get("bc");
    const breadcrumbsDisplay = [];
    if (breadcrumbs) {
      const crumbs = breadcrumbs.split(";");
      crumbs.forEach((crumb) => {
        // The geoDcid reference and human-readable curGeo are separated by a '~'.
        const [levelRef, humanName] = crumb.split(BREADCRUMB_NAME_SEPARATOR);
        if (levelRef) {
          breadcrumbsDisplay.push(
            <span
              key={levelRef}
              className="clickable-link"
              onClick={() => this.redirectToGeo(levelRef, curGeo)}
            >
              {humanName + " > "}
            </span>
          );
        }
      });
      breadcrumbsDisplay.push(<span key={curGeo}>{curGeo}</span>);
    }
    // Add breadcrumbs + current geoId
    // Example: "USA" > "FL" > "Miami-Dade"
    // Where Miami-Dade is the current id
    ReactDOM.render(breadcrumbsDisplay, document.getElementById("breadcrumbs"));
  };

  public render = (): JSX.Element => {
    return <div id="svg-container" ref={this.svgContainerElement}></div>;
  };
}

/**
 * Builds a redirect link given the fields to include from search params.
 * @param fieldsToInclude
 */
const buildChoroplethParams = (fieldsToInclude: string[]): string => {
  let params = "?";
  const url = new URL(window.location.href);
  for (const index in fieldsToInclude) {
    const arg_name = fieldsToInclude[index];
    const arg_value = url.searchParams.get(arg_name);
    if (arg_value != null) {
      params += "&" + arg_name + "=" + arg_value;
    }
  }
  return params;
};

function addTooltip() {
  d3.select("#svg-container")
    .attr("style", "position: relative")
    .append("div")
    .attr("id", TOOLTIP_ID)
    .attr("style", "position: absolute; display: none; z-index: 1");
}

function showLoading() {
  d3.select("#loading-overlay").attr("style", "display: flex");
}

function removeLoading() {
  d3.select("#loading-overlay").attr("style", "display: none");
}
/**
 * Returns domain of color palette as len 9 numerical array for plotting.
 * @param dict of values mapping geoDcid to number returned by /values endpoint.
 * @param pc boolean if plotting pc.
 * @param popMap json object mapping geoDcid to total population.
 *
 * TODO(fpernice-google): investigate built-in color palettes in d3 like d3.schemeBlues.
 */
const determineColorPalette = (dict, pc: boolean, popMap): number[] => {
  // Create a sorted list of values.
  const values = [];
  for (const key in dict) {
    if (pc) {
      if (Object.prototype.hasOwnProperty.call(popMap, key)) {
        values.push(dict[key] / popMap[key]);
      }
    } else {
      values.push(dict[key]);
    }
  }
  values.sort((a, b) => a - b);
  const len = values.length;

  // Find 9 values with equal separation from one another.
  const steps = 9;
  if (len >= steps) {
    const start = 0;
    return d3.range(start, steps).map((d) => {
      return values[Math.floor(((len - 1) * d) / (steps - 1))];
    });
  } else {
    alert(
      "Not enough values to plot. Please choose a different statistical \
           variable or geographic area."
    );
    return [0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
};

/**
 * Returns a nicely formatted hover value for the value of statistical variables
 * for geographies.
 * @param geoValue statistical variable value to display.
 * @param isPerCapita whether the value is a per capita indicator.
 */
const formatGeoValue = (geoValue: number | string, isPerCapita: boolean) => {
  // Per capita values may be difficult to read so add a per count field.
  // E.g. 0.0052 or 5.2 per 1000.
  if (!isPerCapita || geoValue === "No Value") {
    return geoValue.toLocaleString();
  } else {
    // Find a multiplier such that the value is greater than 1.
    if (geoValue < 1) {
      let multiplier = 1;
      let dispValue = geoValue as number;
      while (dispValue && dispValue < 1) {
        dispValue *= 10;
        multiplier *= 10;
      }
      return `${(geoValue as number).toFixed(
        6
      )} or ${dispValue.toLocaleString()} per ${multiplier.toLocaleString()} people`;
    } else {
      return geoValue.toLocaleString() + " per capita";
    }
  }
};

const formatTitle = (statVar: string, geoName: string): string => {
  const pieces = statVar.split("_");
  let statVarName = pieces.join(" ");
  for (const key in NAME_REPLACEMENT_DICT) {
    statVarName = statVarName.replace(key, NAME_REPLACEMENT_DICT[key]);
  }
  return statVarName + " in " + geoName;
};

const updateTitle = (statVar: string, geoName: string): void => {
  document.getElementById("heading").innerHTML = formatTitle(statVar, geoName);
};

type DatePickerPropsType = {
  dates: string[];
  selectedDate: string;
  onSelectedDateChanged: (event: { target: { value: string } }) => void;
};

/**
 * Select or Dropdown component with the available dates as options.
 */
const DatePicker = (props: DatePickerPropsType): JSX.Element => {
  // Sort the dates in descending order.
  const sortedDates = props.dates.sort().reverse();
  if (_.isEmpty(sortedDates)) {
    return null;
  }
  const selectedDate =
    props.selectedDate === LATEST_DATE ? sortedDates[0] : props.selectedDate;

  // Create the option components.
  const dateComponents = sortedDates.map((date) => {
    return (
      <option key={date} value={date}>
        {date}
      </option>
    );
  });

  // Return the select component.
  return (
    <select onChange={props.onSelectedDateChanged} defaultValue={selectedDate}>
      {dateComponents}
    </select>
  );
};

export { ChoroplethMap };
