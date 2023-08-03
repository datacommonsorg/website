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

import * as d3 from "d3";
import _ from "lodash";
import React from "react";
import { FormattedMessage } from "react-intl";

import { DataGroup, DataPoint, expandDataPoints } from "../chart/base";
import {
  drawGroupBarChart,
  drawLineChart,
  drawStackBarChart,
} from "../chart/draw";
import { drawD3Map, getProjection } from "../chart/draw_d3_map";
import { generateLegendSvg, getColorScale } from "../chart/draw_map_utils";
import {
  ChartBlockData,
  chartTypeEnum,
  ChoroplethDataGroup,
  GeoJsonData,
  GeoJsonFeatureProperties,
  SnapshotData,
  TrendData,
} from "../chart/types";
import { RankingUnit } from "../components/ranking_unit";
import { fetchData } from "../components/tiles/ranking_tile";
import {
  ASYNC_ELEMENT_CLASS,
  ASYNC_ELEMENT_HOLDER_CLASS,
} from "../constants/css_constants";
import {
  formatNumber,
  intl,
  LocalizedLink,
  localizeSearchParams,
} from "../i18n/i18n";
import {
  GA_EVENT_PLACE_CHART_CLICK,
  GA_PARAM_PLACE_CHART_CLICK,
  GA_VALUE_PLACE_CHART_CLICK_DATA_SOURCE,
  GA_VALUE_PLACE_CHART_CLICK_EXPLORE_MORE,
  GA_VALUE_PLACE_CHART_CLICK_EXPORT,
  triggerGAEvent,
} from "../shared/ga_events";
import { getStatsVarLabel } from "../shared/stats_var_labels";
import { NamedPlace } from "../shared/types";
import { isDateTooFar, urlToDomain } from "../shared/util";
import { RankingGroup, RankingPoint } from "../types/ranking_unit_types";
import {
  dataGroupsToCsv,
  mapDataToCsv,
  rankingPointsToCsv,
} from "../utils/chart_csv_utils";
import { ChartEmbed } from "./chart_embed";
import { getChoroplethData, getGeoJsonData } from "./fetch";
import { updatePageLayoutState } from "./place";

const CHART_HEIGHT = 194;
const MIN_CHOROPLETH_DATAPOINTS = 9;
const CHOROPLETH_REDIRECT_BASE_URL = "/place/";
const MIN_RANKING_DATAPOINTS = 6;
const MAX_RANKING_DATAPOINTS = 10;
const MIN_WIDTH_TO_SHOW_RANKING_VALUE = 450;
const NUM_FRACTION_DIGITS = 2;

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
   * The place type for the ranking chart.
   */
  rankingPlaceType?: string;
  /**
   * The parent place dcid for ranking chart.
   */
  parentPlaceDcid?: string;
  /**
   * The chart spec.
   */
  spec?: ChartBlockData;
}

interface ChartStateType {
  dataPoints?: DataPoint[];
  dataGroups?: DataGroup[];
  choroplethDataGroup?: ChoroplethDataGroup;
  geoJson?: GeoJsonData;
  rankingGroup?: RankingGroup;
  elemWidth: number;
  display: boolean;
  showModal: boolean;
}

class Chart extends React.Component<ChartPropType, ChartStateType> {
  chartElement: React.RefObject<HTMLDivElement>;
  svgContainerElement: React.RefObject<HTMLDivElement>;
  embedModalElement: React.RefObject<ChartEmbed>;
  mapContainerElement: React.RefObject<HTMLDivElement>;
  legendContainerElement: React.RefObject<HTMLDivElement>;
  dcid: string;
  rankingUrlByStatVar: { [key: string]: string };
  statsVars: string[];
  placeLinkSearch: string; // Search parameter string including '?'

  constructor(props: ChartPropType) {
    super(props);
    this.chartElement = React.createRef();
    this.svgContainerElement = React.createRef();
    this.embedModalElement = React.createRef();
    if (props.chartType === chartTypeEnum.CHOROPLETH) {
      this.mapContainerElement = React.createRef();
      this.legendContainerElement = React.createRef();
    }

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
    sources.sort();
    const sourcesJsx = sources.map((source, index) => {
      const domain = urlToDomain(source);
      return (
        <span key={source}>
          <a
            href={source}
            onClick={() =>
              triggerGAEvent(GA_EVENT_PLACE_CHART_CLICK, {
                [GA_PARAM_PLACE_CHART_CLICK]:
                  GA_VALUE_PLACE_CHART_CLICK_DATA_SOURCE,
              })
            }
          >
            {domain}
          </a>
          {index < sources.length - 1 ? ", " : ""}
        </span>
      );
    });
    return (
      <div className="col">
        <div
          className={`chart-container ${ASYNC_ELEMENT_HOLDER_CLASS}`}
          ref={this.chartElement}
        >
          <h4>
            {this.props.title}
            <span className="sub-title">{dateString}</span>
          </h4>
          <div
            id={this.props.id}
            ref={this.svgContainerElement}
            className="svg-container"
          >
            {this.props.chartType === chartTypeEnum.CHOROPLETH && (
              <div className="map-container">
                <div className="map" ref={this.mapContainerElement}></div>
                <div ref={this.legendContainerElement}></div>
              </div>
            )}
            {this.props.chartType === chartTypeEnum.RANKING &&
              this.state.rankingGroup && (
                <div
                  className={"ranking-chart-container " + ASYNC_ELEMENT_CLASS}
                >
                  <h4>{this.getRankingChartContainerTitle()}</h4>
                  <div className="ranking-chart">
                    <RankingUnit
                      title="Highest"
                      points={this.state.rankingGroup.rankingData.highest}
                      isHighest={true}
                      unit={[this.props.unit]}
                      highlightedDcid={this.props.dcid}
                      hideValue={
                        this.state.elemWidth <= MIN_WIDTH_TO_SHOW_RANKING_VALUE
                      }
                    />
                    <RankingUnit
                      title="Lowest"
                      points={this.state.rankingGroup.rankingData.lowest}
                      isHighest={false}
                      unit={[this.props.unit]}
                      numDataPoints={this.state.rankingGroup.numDataPoints}
                      highlightedDcid={this.props.dcid}
                      hideValue={
                        this.state.elemWidth <= MIN_WIDTH_TO_SHOW_RANKING_VALUE
                      }
                    />
                  </div>
                </div>
              )}
          </div>
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
              <a
                href="#"
                onClick={(event) => {
                  this._handleEmbed(event);
                  triggerGAEvent(GA_EVENT_PLACE_CHART_CLICK, {
                    [GA_PARAM_PLACE_CHART_CLICK]:
                      GA_VALUE_PLACE_CHART_CLICK_EXPORT,
                  });
                }}
              >
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
                  onClick={() =>
                    triggerGAEvent(GA_EVENT_PLACE_CHART_CLICK, {
                      [GA_PARAM_PLACE_CHART_CLICK]:
                        GA_VALUE_PLACE_CHART_CLICK_EXPLORE_MORE,
                    })
                  }
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
    // Table is a react component. Prevent the inner HTML of the svg-container from being changed by drawchart().
    if (this.props.chartType === chartTypeEnum.RANKING) {
      return;
    }
    // Draw chart.
    try {
      this.drawChart();
    } catch (e) {
      return;
    }
    updatePageLayoutState();
  }

  componentWillUnmount(): void {
    window.removeEventListener("resize", this._handleWindowResize);
  }

  componentDidMount(): void {
    window.addEventListener("resize", this._handleWindowResize);
    this.processData();
    // Set the elemwidth to be the svg offsetwidth.
    // Prevent the ranking unit from displaying the value if the initial width is too narrow.
    if (this.props.chartType === chartTypeEnum.RANKING) {
      this._handleWindowResize();
    }
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
      return mapDataToCsv(
        this.state.geoJson,
        this.state.choroplethDataGroup.data
      );
    }
    if (this.state.rankingGroup) {
      const data = this.state.rankingGroup.points;
      return rankingPointsToCsv(data, ["data"]);
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
    const svgElems =
      this.svgContainerElement.current.getElementsByTagName("svg");
    let svgXml: string;
    if (svgElems.length) {
      svgXml = svgElems.item(0).outerHTML;
    }
    this.embedModalElement.current.show(
      svgXml,
      this.dataCsv(),
      this.svgContainerElement.current.offsetWidth,
      CHART_HEIGHT,
      "",
      this.props.title,
      this.getDateString(),
      this.getSources()
    );
  }

  drawChart(): void {
    const chartType = this.props.chartType;
    const elem = document.getElementById(this.props.id) as HTMLDivElement;
    if (chartType !== chartTypeEnum.CHOROPLETH) {
      elem.innerHTML = "";
    }
    if (chartType === chartTypeEnum.LINE) {
      const isCompleteLine = drawLineChart(
        elem,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        false,
        false,
        formatNumber,
        {
          unit: this.props.unit,
        }
      );
      if (!isCompleteLine) {
        this.chartElement.current.querySelectorAll(
          ".dotted-warning"
        )[0].className += " d-inline";
      }
    } else if (chartType === chartTypeEnum.STACK_BAR) {
      drawStackBarChart(
        this.svgContainerElement.current,
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        formatNumber,
        {
          unit: this.props.unit,
        }
      );
    } else if (chartType === chartTypeEnum.GROUP_BAR) {
      drawGroupBarChart(
        elem,
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        formatNumber,
        {
          unit: this.props.unit,
        }
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
        let value = "Data Unavailable";
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
      const dataValues = Object.values(this.state.choroplethDataGroup.data);
      const colorScale = getColorScale(
        this.props.statsVars[0],
        d3.min(dataValues),
        d3.mean(dataValues),
        d3.max(dataValues)
      );
      const legendWidth = generateLegendSvg(
        this.legendContainerElement.current,
        CHART_HEIGHT,
        colorScale,
        this.props.unit,
        0,
        formatNumber
      );
      const mapWidth = elem.offsetWidth - legendWidth;
      const projection = getProjection(
        this.props.isUsaPlace,
        this.props.dcid,
        mapWidth,
        CHART_HEIGHT,
        this.state.geoJson
      );
      drawD3Map(
        this.mapContainerElement.current,
        this.state.geoJson,
        CHART_HEIGHT,
        mapWidth,
        this.state.choroplethDataGroup.data,
        colorScale,
        redirectAction,
        getTooltipHtml,
        () => true,
        true,
        projection
      );
    }
  }

  private processData(): void {
    const dataGroups: DataGroup[] = [];
    const allDates = new Set<string>();
    // TODO(datcom): handle i18n for scaled numbers
    const scaling = this.props.scaling ? this.props.scaling : 1;
    const sv = !_.isEmpty(this.props.statsVars) ? this.props.statsVars[0] : "";
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
          dataGroups,
        });
        break;
      case chartTypeEnum.CHOROPLETH:
        Promise.all([
          getGeoJsonData(
            this.props.dcid,
            document.getElementById("locale").dataset.lc
          ),
          getChoroplethData(this.props.dcid, this.props.spec),
        ]).then(([geoJsonData, choroplethData]) => {
          if (
            _.isEmpty(choroplethData) ||
            _.isEmpty(geoJsonData) ||
            choroplethData.numDataPoints < MIN_CHOROPLETH_DATAPOINTS
          ) {
            this.setState({
              display: false,
            });
          } else {
            this.setState({
              choroplethDataGroup: choroplethData,
              geoJson: geoJsonData,
            });
          }
        });
        break;
      case chartTypeEnum.RANKING:
        if (_.isEmpty(sv)) {
          this.setState({ display: false });
          return;
        }
        // Fields like unit, denom, scaling and etc. are not used for data
        // fetch, hence setting a dummy value here.
        fetchData({
          id: "",
          enclosedPlaceType: this.props.rankingPlaceType,
          place: { dcid: this.props.parentPlaceDcid, name: "", types: [] },
          rankingMetadata: {
            diffBaseDate: "",
            showHighest: true,
            showLowest: true,
            showMultiColumn: false,
          },
          statVarSpec: [
            {
              denom: "",
              log: false,
              scaling: 1,
              statVar: sv,
              unit: "",
            },
          ],
          title: "",
        })
          .then((rankingChartData) => {
            const svData = rankingChartData[sv];
            svData.points.reverse();
            // Do not display the ranking chart if total data points is less than the MIN_RANKING_DATAPOINTS
            if (
              _.isEmpty(svData) ||
              svData.numDataPoints < MIN_RANKING_DATAPOINTS
            ) {
              this.setState({ display: false });
              return;
            }
            for (const data of svData.points) {
              data.value = data.value * scaling;
            }
            svData.rankingData = this.getRankingChartData(svData);
            this.setState({ rankingGroup: svData });
          })
          .catch(() => {
            this.setState({ display: false });
          });
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
    }
    if (this.props.chartType === chartTypeEnum.RANKING) {
      return (
        `/ranking/${this.statsVars[0]}` +
        `/${this.props.rankingPlaceType}/${this.props.parentPlaceDcid}` +
        `?h=${this.props.dcid}&unit=${this.props.unit || ""}&scaling=${
          this.props.scaling || ""
        }`
      );
    }
    return this.props.trend
      ? this.props.trend.exploreUrl
      : this.props.snapshot.exploreUrl;
  }

  private getSources(): string[] {
    if (this.props.chartType == chartTypeEnum.CHOROPLETH) {
      return this.state.choroplethDataGroup
        ? this.state.choroplethDataGroup.sources
        : [];
    }
    if (this.props.chartType === chartTypeEnum.RANKING) {
      return this.state.rankingGroup
        ? Array.from(this.state.rankingGroup.sources)
        : [];
    }
    return this.props.trend
      ? this.props.trend.sources
      : this.props.snapshot.sources;
  }

  private getDateString(): string {
    if (this.props.chartType == chartTypeEnum.CHOROPLETH) {
      return this.state.choroplethDataGroup
        ? "(" + this.state.choroplethDataGroup.date + ")"
        : "";
    }
    if (this.props.chartType === chartTypeEnum.RANKING) {
      return this.state.rankingGroup
        ? "(" + this.state.rankingGroup.dateRange + ")"
        : "";
    }
    return this.props.snapshot ? "(" + this.props.snapshot.date + ")" : "";
  }

  private getRankingChartData(data: RankingGroup): {
    lowest: RankingPoint[];
    highest: RankingPoint[];
  } {
    const lowestAndHighestDataPoints = { lowest: [], highest: [] };
    if (
      data.numDataPoints >= MIN_RANKING_DATAPOINTS &&
      data.numDataPoints <= MAX_RANKING_DATAPOINTS
    ) {
      const sliceNumber = Math.floor(data.numDataPoints / 2);
      lowestAndHighestDataPoints.lowest = data.points
        .slice(-sliceNumber)
        .reverse();
      lowestAndHighestDataPoints.highest = data.points.slice(0, sliceNumber);
      return lowestAndHighestDataPoints;
    }
    const sliceNumber = Math.floor(MAX_RANKING_DATAPOINTS / 2);
    lowestAndHighestDataPoints.lowest = data.points
      .slice(-sliceNumber)
      .reverse();
    lowestAndHighestDataPoints.highest = data.points.slice(0, sliceNumber);
    return lowestAndHighestDataPoints;
  }

  private getRankingChartContainerTitle(): string {
    const placeName = this.props.names[this.props.dcid] || this.props.dcid;
    for (let i = 0; i < this.state.rankingGroup.points.length; i++) {
      const item = this.state.rankingGroup.points[i];
      if (item.placeDcid === this.props.dcid) {
        const value = formatNumber(
          item.value,
          this.props.unit,
          false,
          NUM_FRACTION_DIGITS
        );
        return `${placeName} ranks ${i + 1} (${value})`;
      }
    }
    return "";
  }
}

export { Chart };
