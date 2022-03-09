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

import _ from "lodash";
import React from "react";
import { FormattedMessage } from "react-intl";

import {
  DataGroup,
  dataGroupsToCsv,
  DataPoint,
  expandDataPoints,
} from "../chart/base";
import {
  drawGroupBarChart,
  drawLineChart,
  drawStackBarChart,
} from "../chart/draw";
import { drawChoropleth, getColorScale } from "../chart/draw_choropleth";
import {
  CachedChoroplethData,
  chartTypeEnum,
  ChoroplethDataGroup,
  GeoJsonData,
  GeoJsonFeatureProperties,
  SnapshotData,
  TrendData,
} from "../chart/types";
import {
  formatNumber,
  intl,
  LocalizedLink,
  localizeSearchParams,
} from "../i18n/i18n";
import { getStatsVarLabel } from "../shared/stats_var_labels";
import { NamedPlace } from "../shared/types";
import { isDateTooFar, urlToDomain } from "../shared/util";
import { ChartEmbed } from "./chart_embed";
import { updatePageLayoutState } from "./place";

const CHART_HEIGHT = 194;
const MIN_CHOROPLETH_DATAPOINTS = 9;
const CHOROPLETH_REDIRECT_BASE_URL = "/place/";

interface ChartPropType {
  /**
   * The place dcid.
   */
  dcid: string;
  /**
   * The svg dom element id.
   */
  id: string;
  /**
   * The chart title
   */
  title: string;
  /**
   * Time series data
   */
  trend?: TrendData;
  /**
   * Snapshot data
   */
  snapshot?: SnapshotData;
  /**
   * The chart type, could be line, single bar or group bar chart.
   */
  chartType: string;
  /**
   * The unit of stat value
   */
  unit: string;
  /**
   * All place names
   */
  names: { [key: string]: string };
  /**
   * Scale number
   */
  scaling?: number;
  /**
   * Promise for Geojson data for choropleth for current dcid.
   */
  geoJsonData?: Promise<GeoJsonData>;
  /**
   * Promise for Values of statvar/denominator combinations for choropleth for current dcid
   */
  choroplethData?: Promise<CachedChoroplethData>;
  /**
   * All stats vars for this chart
   */
  statsVars: string[];
  /**
   * Template to create links to place rankings (replace _sv_ with a StatVar)
   */
  rankingTemplateUrl: string;
  /**
   * The category of the page the chart is in
   */
  category: string;
  /**
   * If the primary place is in USA.
   */
  isUsaPlace: boolean;
  /**
   * If the chart should update the page layour with a sidebar.
   */
  doUpdatePageLayoutState: boolean;
}

interface ChartStateType {
  dataPoints?: DataPoint[];
  dataGroups?: DataGroup[];
  choroplethDataGroup?: ChoroplethDataGroup;
  geoJson?: GeoJsonData;
  elemWidth: number;
  display: boolean;
  showModal: boolean;
}

class Chart extends React.Component<ChartPropType, ChartStateType> {
  chartElement: React.RefObject<HTMLDivElement>;
  svgContainerElement: React.RefObject<HTMLDivElement>;
  embedModalElement: React.RefObject<ChartEmbed>;
  dcid: string;
  rankingUrlByStatVar: { [key: string]: string };
  statsVars: string[];
  placeLinkSearch: string; // Search parameter string including '?'

  constructor(props: ChartPropType) {
    super(props);
    this.chartElement = React.createRef();
    this.svgContainerElement = React.createRef();
    this.embedModalElement = React.createRef();

    this.state = {
      display: true,
      elemWidth: 0,
      showModal: false,
    };
    // Consider debouncing / throttling this if it gets expensive at
    // small screen sizes
    this._handleWindowResize = this._handleWindowResize.bind(this);
    this._handleEmbed = this._handleEmbed.bind(this);

    // For aggregated stats vars, the per chart stats vars are availabe in
    // chart level not chart block level.
    if (this.props.statsVars.length > 0) {
      this.statsVars = this.props.statsVars;
    } else if (this.props.trend) {
      this.statsVars = this.props.trend.statsVars;
    } else if (this.props.snapshot) {
      this.statsVars = this.props.snapshot.statsVars;
    } else {
      this.statsVars = [];
    }
    this.rankingUrlByStatVar = {};
    for (const statVar of this.statsVars) {
      this.rankingUrlByStatVar[statVar] = this.props.rankingTemplateUrl.replace(
        "_sv_",
        statVar
      );
    }

    const linkSuffix = localizeSearchParams(
      new URLSearchParams(
        this.props.category === "Overview"
          ? ""
          : "category=" + this.props.category
      )
    ).toString();
    this.placeLinkSearch = linkSuffix ? `?${linkSuffix}` : "";
  }

  render(): JSX.Element {
    if (!this.state.display) {
      return null;
    }
    const dateString = this.getDateString();
    const exploreUrl = this.getExploreUrl();
    const sources = this.getSources();
    if (!sources) {
      console.log(`Skipping ${this.props.title} - missing sources`);
      return null;
    }
    const sourcesJsx = sources.map((source, index) => {
      const domain = urlToDomain(source);
      return (
        <span key={source}>
          <a href={source}>{domain}</a>
          {index < sources.length - 1 ? ", " : ""}
        </span>
      );
    });
    return (
      <div className="col">
        <div className="chart-container" ref={this.chartElement}>
          <h4>
            {this.props.title}
            <span className="sub-title">{dateString}</span>
          </h4>
          <div
            id={this.props.id}
            ref={this.svgContainerElement}
            className="svg-container"
          ></div>
          <footer className="row explore-more-container">
            <div>
              <FormattedMessage
                id="chart_metadata-provenance"
                defaultMessage="Data from {sources}"
                description="Used to cite where our data is from, but that it was provided through Data Commons. e.g., 'Data from {nytimes.com} via Data Commons' or 'Data from {census.gov, nytimes.com}'"
                values={{ sources: sourcesJsx }}
              />
              <span className="dotted-warning d-none">
                {" "}
                <FormattedMessage
                  id="chart_metadata-dotted_line_explanation"
                  defaultMessage="(dotted line denotes missing data)"
                  description="Text to explain that dotted lines mean there are missing data. Please keep the parenthesis."
                />
              </span>
            </div>
            <div className="outlinks">
              <a href="#" onClick={this._handleEmbed}>
                <FormattedMessage
                  id="chart_metadata-export"
                  defaultMessage="Export"
                  description="Hyperlink text to export the data shown in charts."
                />
              </a>
              {intl.locale != "en" ? null : (
                <a
                  className="explore-more"
                  href={exploreUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <FormattedMessage
                    id="chart_metadata-explore_more"
                    defaultMessage="Explore More ›"
                    description="Hyperlink text to explore the data in a different page. Please keep the '›' symbol."
                  />
                </a>
              )}
            </div>
          </footer>
        </div>
        <LocalizedLink
          className="feedback"
          href="/feedback"
          text={intl.formatMessage({
            id: "chart_metadata-feedback",
            defaultMessage: "Feedback",
            description:
              "Text label for hyperlink to give Data Commons feedback on something on our website.",
          })}
        />
        <ChartEmbed ref={this.embedModalElement} />
      </div>
    );
  }

  componentDidUpdate(): void {
    // Draw chart.
    try {
      this.drawChart();
    } catch (e) {
      return;
    }
    if (this.props.doUpdatePageLayoutState) {
      updatePageLayoutState();
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener("resize", this._handleWindowResize);
  }

  componentDidMount(): void {
    window.addEventListener("resize", this._handleWindowResize);
    this.processData();
  }

  private _handleWindowResize(): void {
    const svgElement = this.svgContainerElement.current;
    if (!svgElement) {
      return;
    }
    // Chart resizes at bootstrap breakpoints
    const width = this.svgContainerElement.current.offsetWidth;
    if (width !== this.state.elemWidth) {
      this.setState({
        elemWidth: width,
      });
    }
  }

  /**
   * Returns data used to draw chart as a CSV.
   */
  private dataCsv(): string {
    // TODO(beets): Handle this.state.dataPoints too.
    const dp = this.state.dataPoints;
    if (dp && dp.length > 0) {
      console.log("Implement CSV function for data points");
      return;
    }
    if (this.state.choroplethDataGroup && this.state.geoJson) {
      const data = this.state.choroplethDataGroup;
      const geo = this.state.geoJson;
      const rows: string[] = ["place,data"];
      for (const g of geo["features"]) {
        const v = g.id in data.data ? data.data[g.id] : "N/A";
        rows.push(`${g.properties.name},${v}`);
      }
      return rows.join("\n");
    }
    return dataGroupsToCsv(this.state.dataGroups);
  }

  /**
   * Handle clicks on "embed chart" link.
   */
  private _handleEmbed(
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ): void {
    e.preventDefault();
    const svgElems = this.svgContainerElement.current.getElementsByTagName(
      "svg"
    );
    let svgXml: string;
    if (svgElems.length) {
      svgXml = svgElems.item(0).outerHTML;
    }
    this.embedModalElement.current.show(
      svgXml,
      this.dataCsv(),
      this.svgContainerElement.current.offsetWidth,
      CHART_HEIGHT,
      this.props.title,
      this.getDateString(),
      this.getSources()
    );
  }

  drawChart(): void {
    const chartType = this.props.chartType;
    const elem = document.getElementById(this.props.id);
    elem.innerHTML = "";
    if (chartType === chartTypeEnum.LINE) {
      const isCompleteLine = drawLineChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        false,
        false,
        this.props.unit
      );
      if (!isCompleteLine) {
        this.chartElement.current.querySelectorAll(
          ".dotted-warning"
        )[0].className += " d-inline";
      }
    } else if (chartType === chartTypeEnum.STACK_BAR) {
      drawStackBarChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        this.props.unit
      );
    } else if (chartType === chartTypeEnum.GROUP_BAR) {
      drawGroupBarChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        this.props.unit
      );
    } else if (
      chartType === chartTypeEnum.CHOROPLETH &&
      this.state.choroplethDataGroup
    ) {
      const redirectAction = (geoProperty: GeoJsonFeatureProperties) => {
        const redirectLink = `${CHOROPLETH_REDIRECT_BASE_URL}${geoProperty.geoDcid}${this.placeLinkSearch}`;
        window.open(redirectLink, "_blank");
      };
      const getTooltipHtml = (place: NamedPlace) => {
        let value = "Data Missing";
        if (this.state.choroplethDataGroup.data[place.dcid]) {
          value = formatNumber(
            Math.round(
              (this.state.choroplethDataGroup.data[place.dcid] +
                Number.EPSILON) *
                100
            ) / 100,
            this.props.unit
          );
        }
        return place.name + ": " + value;
      };
      const colorScale = getColorScale(
        this.props.statsVars[0],
        this.state.choroplethDataGroup.data
      );
      drawChoropleth(
        this.props.id,
        this.state.geoJson,
        CHART_HEIGHT,
        elem.offsetWidth,
        this.state.choroplethDataGroup.data,
        this.props.unit,
        colorScale,
        redirectAction,
        getTooltipHtml,
        () => true,
        true,
        true,
        this.props.isUsaPlace,
        this.props.dcid
      );
    }
  }

  private processData(): void {
    const dataGroups: DataGroup[] = [];
    const allDates = new Set<string>();
    // TODO(datcom): handle i18n for scaled numbers
    const scaling = this.props.scaling ? this.props.scaling : 1;
    switch (this.props.chartType) {
      case chartTypeEnum.LINE:
        for (const statVar in this.props.trend.series) {
          const dataPoints: DataPoint[] = [];
          for (const date in this.props.trend.series[statVar]) {
            // TODO(shifucun): consider move this to mixer so we can save the
            // check here.
            // This depends on if all the data in IPCC are desired by the API
            // users.
            if (isDateTooFar(date)) {
              continue;
            }
            allDates.add(date);
            dataPoints.push({
              label: date,
              time: new Date(date).getTime(),
              value: this.props.trend.series[statVar][date] * scaling,
            });
          }
          dataGroups.push(
            new DataGroup(
              getStatsVarLabel(statVar),
              dataPoints,
              this.rankingUrlByStatVar[statVar]
            )
          );
        }
        for (let i = 0; i < dataGroups.length; i++) {
          dataGroups[i].value = expandDataPoints(dataGroups[i].value, allDates);
        }
        this.setState({
          dataGroups,
        });
        break;
      case chartTypeEnum.GROUP_BAR:
      // Fall-through
      case chartTypeEnum.STACK_BAR:
        for (const placeData of this.props.snapshot.data) {
          const dataPoints: DataPoint[] = [];
          for (const statVar of this.statsVars) {
            const val = placeData.data[statVar];
            dataPoints.push({
              label: getStatsVarLabel(statVar),
              value: val ? val * scaling : null,
              dcid: placeData.dcid,
              link: this.rankingUrlByStatVar[statVar],
            });
          }
          dataGroups.push(
            new DataGroup(
              this.props.names[placeData.dcid],
              dataPoints,
              `/place/${placeData.dcid}${this.placeLinkSearch}`
            )
          );
        }
        this.setState({
          dataGroups: dataGroups,
        });
        break;
      case chartTypeEnum.CHOROPLETH:
        if (this.props.geoJsonData && this.props.choroplethData) {
          Promise.all([this.props.geoJsonData, this.props.choroplethData]).then(
            ([geoJsonData, choroplethData]) => {
              const sv = !_.isEmpty(this.props.statsVars)
                ? this.props.statsVars[0]
                : "";
              const svData = choroplethData[sv];
              if (
                _.isEmpty(svData) ||
                _.isEmpty(geoJsonData) ||
                svData.numDataPoints < MIN_CHOROPLETH_DATAPOINTS
              ) {
                this.setState({
                  display: false,
                });
              } else {
                this.setState({
                  choroplethDataGroup: svData,
                  geoJson: geoJsonData,
                });
              }
            }
          );
        }
        break;
      default:
        break;
    }
  }

  private getExploreUrl(): string {
    if (this.props.chartType === chartTypeEnum.CHOROPLETH) {
      return this.state.choroplethDataGroup
        ? this.state.choroplethDataGroup.exploreUrl
        : "";
    } else {
      return this.props.trend
        ? this.props.trend.exploreUrl
        : this.props.snapshot.exploreUrl;
    }
  }

  private getSources(): string[] {
    if (this.props.chartType == chartTypeEnum.CHOROPLETH) {
      return this.state.choroplethDataGroup
        ? this.state.choroplethDataGroup.sources
        : [];
    } else {
      return this.props.trend
        ? this.props.trend.sources
        : this.props.snapshot.sources;
    }
  }

  private getDateString(): string {
    if (this.props.chartType == chartTypeEnum.CHOROPLETH) {
      return this.state.choroplethDataGroup
        ? "(" + this.state.choroplethDataGroup.date + ")"
        : "";
    } else {
      return this.props.snapshot ? "(" + this.props.snapshot.date + ")" : "";
    }
  }
}

export { Chart };
