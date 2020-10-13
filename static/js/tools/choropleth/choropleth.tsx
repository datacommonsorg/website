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

type PropsType = unknown;

// TODO(eduardo): get rid of "unknown" type.
type StateType = {
  geoJson: unknown;
  values: { [geoId: string]: number };
  data: { [geoId: string]: { [date: string]: number } };
  date: string;
  mapContent: unknown;
  pc: boolean;
  popMap: { [geoId: string]: number };
};

class ChoroplethMap extends Component<PropsType, StateType> {
  public state = {
    geoJson: [] as any,
    data: {},
    date: "latest",
    mapContent: {} as any,
    pc: false,
    popMap: {},
    values: {},
  };

  public componentDidMount = (): void => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPerCapita =
      urlParams.has("pc") &&
      ["t", "true", "1"].includes(urlParams.get("pc").toLowerCase());
    this.setState({
      pc: isPerCapita,
    });
    this.loadGeoJson();
  };

  /**
   * Loads and renders blank GeoJson map for current geoDcid.
   * After loading, values for a particular StatVar are pulled.
   */
  private loadGeoJson = (): void => {
    let geoUrl = "/api/choropleth/geo";
    geoUrl += buildChoroplethParams(["pc", "geoDcid", "level", "mdom"]);
    let valueUrl = "/api/choropleth/values";
    valueUrl += buildChoroplethParams(["geoDcid", "statVar", "level"]);

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
        const geoIdToValues = this.filterByDate(data, "latest");

        this.setState({
          geoJson: geoJson,
          values: geoIdToValues,
          data: data,
        });

        //TODO(iancostello): Investigate if this can be moved to
        //shouldComponentUpdate.
        this.drawBlankGeoMap();
        this.addColorToGeoMap();
      },
      () => {
        document.getElementById("heading").innerHTML = "";
        document.getElementById("error").innerHTML =
          "API Request Failed! " +
          "Please consider starting at the base menu again." +
          '<a href="/tools/choropleth"> Access here.</a>';
      }
    );
  };

  /**
   * Loads values for the current geoDcid and updates map.
   */
  private loadValues = (): void => {
    let baseUrl = "/api/choropleth/values";
    baseUrl += buildChoroplethParams(["geoDcid", "level", "statVar"]);

    axios.get(baseUrl).then(
      (resp) => {
        // Because this is the first time loading the page,
        // filter the value by "latest" date.
        const data = resp.data[0];
        const geoIdToValues = this.filterByDate(data, "latest");

        // values contains only the data for the date being observed.
        // data contains the raw data.
        // In case the user wants to switch date xor data.
        this.setState({
          values: geoIdToValues,
          data: data,
        });

        this.addColorToGeoMap();
      },
      () => {
        document.getElementById("heading").innerHTML = "";
        document.getElementById("error").innerHTML =
          "API request failed for your" +
          "statistical variable choice! Please select a new variable.";
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
    const geojson = this.state["geoJson"];
    const mapContent = d3
      .select("#main-pane g.map")
      .selectAll("path")
      .data(geojson.features);

    // Scale and center the map.
    const svgContainer = document.getElementById("map_container");
    const projection = d3
      .geoAlbersUsa()
      .fitSize([svgContainer.clientWidth, svgContainer.clientHeight], geojson);
    const geomap = d3.geoPath().projection(projection);

    // Build map objects.
    mapContent
      .enter()
      .append("path")
      .attr("d", geomap)
      // Add CSS class to each path for border outlining.
      .attr("class", "border")
      .attr("fill", "gray")
      // Add various event handlers.
      .on("mouseover", this.handleMapHover)
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

    // Generate breadcrumbs.
    // TODO(fpernice-google): Derive the curGeo value from geoDcid instead
    // of embedding in url.
    generateBreadCrumbs(this.state["geoJson"]["properties"]["current_geo"]);
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
      "#f7fbff",
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
        return "geoPath/" + index;
      });

    // Create new infill.
    mapContent.attr(
      "fill",
      (d: { properties: { geoDcid: string; pop: number } }) => {
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
      }
    );

    // Update title.
    // TODO(iancostello): Use react component instead of innerHTML throughout.
    const url = new URL(window.location.href);
    const currentGeo = this.state["geoJson"]["properties"]["current_geo"];
    const currentStatVar = url.searchParams.get("statVar");
    if (currentStatVar) {
      document.getElementById("heading").innerHTML =
        currentStatVar + " in " + currentGeo;
    } else {
      document.getElementById("heading").innerHTML = currentGeo;
      document.getElementById("hover-text-display").innerHTML =
        "Pick a statistical variable to get started!";
    }
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
    const width = 300;
    const height = 60;
    const tickSize = 6;
    const title = "Color Scale";
    const marginTop = 18;
    const marginBottom = 16 + tickSize;
    const marginSides = 15;
    const textPadding = 6;
    const numTicks = 5;

    // Remove previous legend if it exists and create new one.
    if (!d3.select("#legend").empty()) {
      d3.select("#legend > *").remove();
    }

    const svg = d3
      .select("#legend")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const n = Math.min(color.domain().length, color.range().length);

    svg
      .append("image")
      .attr("id", "legend-img")
      .attr("x", marginSides)
      .attr("y", marginTop)
      .attr("width", width - 2 * marginSides)
      .attr("height", height - marginTop - marginBottom)
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
        d3.quantize(d3.interpolate(marginSides, width - marginSides), n)
      );

    const dom = color.domain();
    const tickValues = d3.range(numTicks).map((i) => {
      const index = Math.floor((i * (dom.length - 1)) / (numTicks - 1));
      return dom[index];
    });

    svg
      .append("g")
      .attr("transform", `translate(0, ${height - marginBottom})`)
      .call(d3.axisBottom(x).tickSize(tickSize).tickValues(tickValues))
      .call((g) =>
        g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height)
      )
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .append("text")
          .attr("x", marginSides)
          .attr("y", marginTop + marginBottom - height - textPadding)
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
      this.drawBlankGeoMap();
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
      if (date === "latest") {
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

  /**
   * Capture hover event on geo and displays relevant information.
   * @param {json} geo is the geoJson content for the hovered geo.
   */
  private handleMapHover = (
    geo: {
      ref: string;
      properties: {
        name: string;
        geoDcid: string;
        pop: number;
        hasSublevel: boolean;
      };
    },
    index: number
  ): void => {
    // Display statistical variable information on hover.
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

    document.getElementById("hover-text-display").innerHTML =
      name + " - " + formatGeoValue(geoValue, this.state["pc"]);

    // Highlight selected subgeos and change pointer if they are clickable.
    let objClass = "border-highlighted";
    if (geo.properties.hasSublevel) {
      objClass += " clickable";
    }
    document.getElementById("geoPath/" + index).setAttribute("class", objClass);
  };

  /**
   * Clears output after leaving a geo.
   */
  private mouseLeave = (_geo: { ref: string }, index: number): void => {
    // Remove hover text.
    document.getElementById("hover-text-display").innerHTML = "";

    // Remove geo display effect.
    document.getElementById("geoPath/" + index).setAttribute("class", "border");
  };

  /**
   * Capture click event on geo and zooms
   * user into that geo in the choropleth tool.
   * @param {json} geo is the geoJson content for the clicked geo.
   */
  private handleMapClick = (geo: {
    properties: { geoDcid: string; hasSublevel: boolean };
  }): void => {
    if (geo.properties.hasSublevel) {
      redirectToGeo(
        geo.properties.geoDcid,
        this.state["geoJson"]["properties"]["current_geo"]
      );
    } else {
      alert("This geo has no further sublevels!");
    }
  };

  public render = (): JSX.Element => {
    // TODO(fpernice-google): Handle window resize event to update map size.
    const w = window.innerWidth;
    const h = window.innerHeight;

    return (
      <>
        <svg
          id="map_container"
          width={`${(w * 2) / 3}px`}
          height={`${(h * 2) / 3.5}px`}
        >
          <g className="map" />
        </svg>
      </>
    );
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

/**
 * Redirects the webclient to a particular geo. Handles breadcrumbs in redirect.
 * @param {string} geoDcid to redirect to.
 * @param {string} human-readable current geo, e.g. United States when geoDcid
 *                 is country/USA.
 */
const redirectToGeo = (geoDcid: string, curGeo: string): void => {
  const url = new URL(window.location.href);

  let baseUrl = "/tools/choropleth";
  baseUrl += buildChoroplethParams(["statVar", "pc", "mdom"]);
  baseUrl += "&geoDcid=" + geoDcid;
  baseUrl += "&bc=";

  // Add or create breadcrumbs field.
  const breadcrumbs = url.searchParams.get("bc");
  if (breadcrumbs != null && breadcrumbs !== "") {
    baseUrl += breadcrumbs + ";";
  }
  // Adds zoomed-in geoDcid and human-readable curGeo.
  baseUrl += url.searchParams.get("geoDcid") + "~" + curGeo;
  window.location.href = baseUrl;
};

/**
 * Generates the breadcrumbs text from browser url.
 * @param {string} human-readable current geo to display
 * at end of list of hierarchy of locations.
 */
const generateBreadCrumbs = (curGeo: string): void => {
  const url = new URL(window.location.href);

  const breadcrumbs = url.searchParams.get("bc");

  if (breadcrumbs) {
    const crumbs = breadcrumbs.split(";");

    // Build url for each reference in the breadcrumbs.
    let baseUrl = "/tools/choropleth";
    baseUrl += buildChoroplethParams(["statVar", "pc", "mdom"]);
    baseUrl += "&geoDcid=";

    let breadcrumbsUpto = "";

    const breadcrumbsDisplay = crumbs
      .map((crumb) => {
        // The geoDcid reference and human-readable curGeo are separated by a '~'.
        const [levelRef, humanName] = crumb.split("~");
        const currUrl = baseUrl + levelRef + "&bc=" + breadcrumbsUpto;
        breadcrumbsUpto += crumb + ";";
        if (levelRef) {
          return <a href={currUrl}>{humanName + " > "}</a>;
        }
      })
      .filter((obj) => obj); // Ommit any null components.

    // Add breadcrumbs + current geoId
    // Example: "USA" > "FL" > "Miami-Dade"
    // Where Miami-Dade is the current id
    ReactDOM.render(
      [breadcrumbsDisplay, curGeo],
      document.getElementById("breadcrumbs")
    );
  }
};

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
    <select
      onChange={props.onSelectedDateChanged}
      defaultValue={props.selectedDate}
    >
      {[
        <option key={"latest"} value={"latest"}>
          Latest Date
        </option>,
        ...dateComponents,
      ]}
    </select>
  );
};

export { ChoroplethMap };
