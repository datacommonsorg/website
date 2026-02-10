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
import { DataCommonsClient } from "@datacommonsorg/client";
import _ from "lodash";
import React, { Component, createRef, ReactElement, RefObject } from "react";
import { FormGroup, Input, Label } from "reactstrap";

import { computePlotParams, PlotParams } from "../../chart/base";
import { drawGroupLineChart } from "../../chart/draw_line";
import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import { CSV_FIELD_DELIMITER } from "../../constants/tile_constants";
import { intl } from "../../i18n/i18n";
import { chartComponentMessages } from "../../i18n/i18n_chart_messages";
import { ChartEmbed } from "../../place/chart_embed";
import { Chip } from "../../shared/chip";
import { WEBSITE_SURFACE } from "../../shared/constants";
import { FacetSelectorFacetInfo } from "../../shared/facet_selector/facet_selector";
import {
  GA_EVENT_TOOL_CHART_PLOT,
  GA_PARAM_PLACE_DCID,
  GA_PARAM_STAT_VAR,
  triggerGAEvent,
} from "../../shared/ga_events";
import {
  buildObservationSpecs,
  ObservationSpec,
  ObservationSpecOptions,
} from "../../shared/observation_specs";
import { StatMetadata } from "../../shared/stat_types";
import { StatVarInfo } from "../../shared/stat_var";
import { StatVarFacetMap, StatVarSpec } from "../../shared/types";
import { getDataCommonsClient } from "../../utils/data_commons_client";
import { getMergedSvg, transformCsvHeader } from "../../utils/tile_utils";
import { fetchFacetsWithMetadata } from "../shared/metadata/metadata_fetcher";
import { ToolChartFooter } from "../shared/vis_tools/tool_chart_footer";
import { ToolChartHeader } from "../shared/vis_tools/tool_chart_header";
import { isIpccStatVarWithMultipleModels } from "../shared_util";
import {
  fetchRawData,
  getStatData,
  getStatVarGroupWithTime,
  shortenStatData,
  StatData,
  statDataFromModels,
  TimelineRawData,
} from "./data_fetcher";
import { getMetahash, setChartOption, setMetahash } from "./util";

const CHART_HEIGHT = 300;

/**
 * This function finds the first available facet ID across all places for a given accessor function.
 * @param places - Array of place identifiers we need to search through
 * @param getFacetForPlace - Function that returns the facet ID for a given place, or undefined
 * @returns The first found facet ID, or undefined if none found
 */
function findFirstAvailableFacet(
  places: string[],
  getFacetForPlace: (place: string) => string | undefined
): string | undefined {
  for (const place of places) {
    const facetId = getFacetForPlace(place);
    if (facetId) {
      return facetId;
    }
  }
  return undefined;
}

interface ChartPropsType {
  chartId: string; // id used for this chart
  placeNameMap: Record<string, string>; // Place dcid to name mapping.
  statVarInfos: Record<string, StatVarInfo>;
  pc: boolean;
  denom: string;
  removeStatVar: (statVar: string) => void;
  onDataUpdate: (mprop: string, data: StatData) => void;
  onMetadataMapUpdate: (
    metadataMap: Record<string, Record<string, StatMetadata>>
  ) => void;
  // Map of stat var dcid to a facet id
  svFacetId: Record<string, string>;
}

interface ChartStateType {
  rawData: TimelineRawData;
  statData: StatData;
  ipccModels: StatData;
  facetList: FacetSelectorFacetInfo[];
  facetListLoading: boolean;
  facetListError: boolean;
  isDataLoaded: boolean;
}

class Chart extends Component<ChartPropsType, ChartStateType> {
  svgContainer: React.RefObject<HTMLDivElement>;
  denomInput: React.RefObject<HTMLInputElement>;
  plotParams: PlotParams;
  units: string[];
  minYear: string; // In the format of YYYY
  maxYear: string; // In the format of YYYY
  resizeObserver: ResizeObserver;
  dataCommonsClient: DataCommonsClient;
  containerRef: RefObject<HTMLDivElement>;
  embedModalElement: RefObject<ChartEmbed>;

  constructor(props: ChartPropsType) {
    super(props);
    this.svgContainer = React.createRef();
    this.denomInput = React.createRef();
    this.containerRef = createRef();
    this.embedModalElement = createRef();
    this.drawChart = this.drawChart.bind(this);
    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.loadRawData = this.loadRawData.bind(this);
    this.processData = this.processData.bind(this);
    this.enrichFacets = this.enrichFacets.bind(this);
    this.handleEmbed = this.handleEmbed.bind(this);
    this.getStatVarSpecs = this.getStatVarSpecs.bind(this);
    this.getDataCsv = this.getDataCsv.bind(this);
    this.getObservationSpecs = this.getObservationSpecs.bind(this);
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    this.minYear = urlParams.get("minYear");
    this.maxYear = urlParams.get("maxYear");
    this.state = {
      rawData: null,
      statData: null,
      ipccModels: null,
      facetList: null,
      facetListLoading: false,
      facetListError: false,
      isDataLoaded: false,
    };
    this.dataCommonsClient = new DataCommonsClient({
      surface: WEBSITE_SURFACE,
    });
  }

  render(): ReactElement {
    const statVars = Object.keys(this.props.statVarInfos);
    // TODO(shifucun): investigate on stats var title, now this is updated
    // several times.
    this.plotParams = computePlotParams(
      this.props.placeNameMap,
      statVars,
      this.props.statVarInfos
    );
    // Stats var chip color is independent of places, so pick one place to
    // provide a key for style look up.
    const placeName = Object.values(this.props.placeNameMap)[0];
    const svFacetId = {};
    for (const sv of statVars) {
      svFacetId[sv] =
        sv in this.props.svFacetId ? this.props.svFacetId[sv] : "";
    }

    // Prepare props for ChartEmbed.
    const embedStatVarSpecs: StatVarSpec[] = [];
    const embedStatVarToFacets: StatVarFacetMap = {};
    if (this.state.isDataLoaded) {
      const places = Object.keys(this.props.placeNameMap);
      for (const svDcid in this.props.statVarInfos) {
        const svInfo = this.props.statVarInfos[svDcid];
        const facetId = findFirstAvailableFacet(
          places,
          (place) => this.state.statData.data[svDcid]?.[place]?.facet
        );
        embedStatVarSpecs.push({
          statVar: svDcid,
          name: svInfo.title,
          denom: this.props.pc ? this.props.denom : undefined,
          facetId,
          log: false,
          scaling: undefined,
          unit: undefined,
        });
        if (facetId) {
          embedStatVarToFacets[svDcid] = new Set([facetId]);
        }
      }
      // Get the denom for ChartEmbed
      if (this.props.pc && this.props.denom) {
        const denomFacetId = findFirstAvailableFacet(
          places,
          (place) =>
            this.state.rawData.statAllData[this.props.denom]?.[place]?.[0]
              ?.facet
        );
        if (denomFacetId) {
          embedStatVarToFacets[this.props.denom] = new Set([denomFacetId]);
        }
      }
    }

    return (
      <div
        className={`chart-container ${ASYNC_ELEMENT_HOLDER_CLASS}`}
        ref={this.containerRef}
      >
        <ToolChartHeader
          svFacetId={svFacetId}
          facetList={this.state.facetList}
          facetListLoading={this.state.facetListLoading}
          facetListError={this.state.facetListError}
          onSvFacetIdUpdated={(svFacetId): void => setMetahash(svFacetId)}
        />
        <div className="card">
          <div className="statVarChipRegion">
            {statVars.map((statVar) => {
              let color: string;
              if (statVars.length > 1) {
                color = this.plotParams.lines[placeName + statVar].color;
              }
              return (
                <Chip
                  key={statVar}
                  id={statVar}
                  title={this.props.statVarInfos[statVar].title}
                  color={color}
                  removeChip={this.props.removeStatVar}
                  onTextClick={(): WindowProxy | null =>
                    window.open(`/tools/statvar#sv=${statVar}`)
                  }
                />
              );
            })}
          </div>
          <div ref={this.svgContainer} className="chart-svg"></div>
        </div>
        <ToolChartFooter
          chartId={this.props.chartId}
          sources={
            this.state.statData ? this.state.statData.sources : new Set()
          }
          mMethods={
            this.state.statData
              ? this.state.statData.measurementMethods
              : new Set()
          }
          hideIsRatio={false}
          isPerCapita={this.props.pc}
          onIsPerCapitaUpdated={(isPerCapita: boolean): void =>
            setChartOption(this.props.chartId, "pc", isPerCapita)
          }
          handleEmbed={this.handleEmbed}
          getObservationSpecs={this.getObservationSpecs}
          containerRef={this.containerRef}
          facets={this.state.statData?.facets}
          statVarSpecs={embedStatVarSpecs}
          statVarToFacets={embedStatVarToFacets}
        ></ToolChartFooter>
        {this.state.isDataLoaded && (
          <ChartEmbed
            ref={this.embedModalElement}
            facets={this.state.statData.facets}
            statVarSpecs={embedStatVarSpecs}
            statVarToFacets={embedStatVarToFacets}
          />
        )}
      </div>
    );
  }

  componentDidMount(): void {
    void this.loadRawData();
    this.resizeObserver = new ResizeObserver(this.handleWindowResize);
    this.resizeObserver.observe(this.svgContainer.current);
    // Triggered when the component is mounted and send data to google analytics.
    triggerGAEvent(GA_EVENT_TOOL_CHART_PLOT, {
      [GA_PARAM_PLACE_DCID]: Object.keys(this.props.placeNameMap),
      [GA_PARAM_STAT_VAR]: Object.keys(this.props.statVarInfos),
    });
  }

  componentWillUnmount(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    // reset the options to default value if the chart is removed
    setChartOption(this.props.chartId, "pc", false);
  }

  componentDidUpdate(
    prevProps: ChartPropsType,
    prevState: ChartStateType
  ): void {
    // Triggered only when the stat vars or places change and send data to google analytics.
    const shouldTriggerGAEvent =
      !_.isEqual(prevProps.placeNameMap, this.props.placeNameMap) ||
      !_.isEqual(
        Object.keys(prevProps.statVarInfos),
        Object.keys(this.props.statVarInfos)
      );
    if (shouldTriggerGAEvent) {
      triggerGAEvent(GA_EVENT_TOOL_CHART_PLOT, {
        [GA_PARAM_PLACE_DCID]: Object.keys(this.props.placeNameMap),
        [GA_PARAM_STAT_VAR]: Object.keys(this.props.statVarInfos),
      });
    }
    // We only need to fetch the raw data when place, statvars or denom changes.
    const shouldLoadData =
      !_.isEqual(prevProps.placeNameMap, this.props.placeNameMap) ||
      !_.isEqual(prevProps.statVarInfos, this.props.statVarInfos) ||
      !_.isEqual(prevProps.denom, this.props.denom);
    if (shouldLoadData) {
      void this.loadRawData();
      return;
    }
    // If stat data or ipccModels data changes, need to redraw the chart
    const shouldDrawChart =
      this.state.statData !== prevState.statData ||
      this.state.ipccModels !== prevState.ipccModels;
    if (shouldDrawChart) {
      this.drawChart();
      return;
    }
    this.processData();
  }

  /**
   * Shows the chart embed (download) modal.
   */
  private handleEmbed(): void {
    if (!this.embedModalElement.current || !this.containerRef.current) return;
    const { svgXml, height, width } = getMergedSvg(this.containerRef.current);
    this.embedModalElement.current.show(
      svgXml,
      this.getDataCsv,
      width,
      height,
      "",
      "",
      "",
      this.state.statData ? Array.from(this.state.statData.sources) : [],
      WEBSITE_SURFACE
    );
  }

  /**
   * Returns callback for fetching chart CSV data
   * @returns A promise that resolves to chart CSV data.
   */
  private getDataCsv(): Promise<string> {
    const dataCommonsClient = getDataCommonsClient();
    const statVarSpecs = this.getStatVarSpecs();
    return dataCommonsClient.getCsvSeries({
      entities: Object.keys(this.props.placeNameMap),
      statVarSpecs,
      variables: [],
      transformHeader: transformCsvHeader,
      fieldDelimiter: CSV_FIELD_DELIMITER,
    });
  }

  /**
   * Builds stat var specs for data fetching.
   */
  private getStatVarSpecs(): StatVarSpec[] {
    const statVarSpecs: StatVarSpec[] = [];
    const statVars = Object.keys(this.props.statVarInfos);
    const metahash = getMetahash();
    for (const statVar of statVars) {
      statVarSpecs.push({
        statVar,
        denom: this.props.pc ? this.props.denom : undefined,
        name: this.props.statVarInfos[statVar]?.title,
        facetId: metahash[statVar],
        unit: undefined,
        scaling: undefined,
        log: false,
      });
    }
    return statVarSpecs;
  }

  /**
   * Callback function for building observation specifications.
   * This is used by the API dialog to generate API calls (e.g., cURL
   * commands) for the user.
   *
   * @returns An array of `ObservationSpec` objects.
   */
  private getObservationSpecs(): ObservationSpec[] {
    const statVarSpecs = this.getStatVarSpecs();
    const options: ObservationSpecOptions = {
      placeDcids: Object.keys(this.props.placeNameMap),
      statVarSpecs,
    };
    return buildObservationSpecs(options);
  }

  private handleWindowResize(): void {
    if (!this.svgContainer.current) {
      return;
    }
    this.drawChart();
  }

  private getFacetList(
    statVars: string[],
    enrichedMetadataMap: Record<string, Record<string, StatMetadata>>
  ): FacetSelectorFacetInfo[] {
    return statVars.map((sv) => {
      const displayNames = isIpccStatVarWithMultipleModels(sv)
        ? { "": "Mean across models" }
        : {};
      return {
        dcid: sv,
        name: this.props.statVarInfos[sv].title || sv,
        metadataMap: enrichedMetadataMap[sv] || {},
        displayNames,
      };
    });
  }

  private async loadRawData(): Promise<void> {
    this.setState({
      facetList: null,
      facetListError: false,
      facetListLoading: true,
      rawData: null,
      isDataLoaded: false,
    });

    const places = Object.keys(this.props.placeNameMap);
    const statVars = Object.keys(this.props.statVarInfos);

    try {
      const rawData = await fetchRawData(places, statVars, this.props.denom);
      this.props.onMetadataMapUpdate(rawData.metadataMap);

      this.setState({ rawData }, () => {
        void this.enrichFacets(statVars, rawData.metadataMap);
      });
    } catch {
      this.setState({
        rawData: null,
        facetListError: true,
        facetListLoading: false,
      });
    }
  }

  private async enrichFacets(
    statVars: string[],
    metadataMap: Record<string, Record<string, StatMetadata>>
  ): Promise<void> {
    try {
      const enriched = await fetchFacetsWithMetadata(
        metadataMap,
        this.dataCommonsClient
      );
      const facetList = this.getFacetList(statVars, enriched);
      this.setState({ facetList, facetListLoading: false });
    } catch {
      console.error("Error loading facets for selection.");
      this.setState({ facetListLoading: false, facetListError: true });
    }
  }

  private processData(): void {
    if (!this.state.rawData) {
      return;
    }
    const places = Object.keys(this.props.placeNameMap);
    const statVars = Object.keys(this.props.statVarInfos);
    let statData = getStatData(
      this.state.rawData,
      places,
      statVars,
      this.props.svFacetId,
      this.props.pc,
      this.props.denom
    );
    if (this.minYear || this.maxYear) {
      statData = shortenStatData(statData, this.minYear, this.maxYear);
    }

    let ipccModels = null;
    // We only want to do multiple model computations on IPCC stat vars with
    // multiple models and only when no source is specified for that stat var.
    const ipccStatVars = statVars.filter(
      (sv) =>
        isIpccStatVarWithMultipleModels(sv) &&
        _.isEmpty(this.props.svFacetId[sv])
    );
    if (!_.isEmpty(ipccStatVars)) {
      const [processedStat, modelStat] = statDataFromModels(
        statData,
        this.state.rawData.statAllData,
        ipccStatVars
      );
      statData = processedStat;
      ipccModels = modelStat;
      ipccModels = shortenStatData(ipccModels, this.minYear, this.maxYear);
    }
    // Get from all stat vars. In most cases there should be only one
    // unit.
    this.units = [];
    const units: Set<string> = new Set();
    for (const statVar in statData.data) {
      for (const place in statData.data[statVar]) {
        const series = statData.data[statVar][place];
        if (!series || !series.facet || !statData.facets[series.facet]) {
          continue;
        }
        const unit = statData.facets[series.facet].unit;
        if (unit) {
          units.add(unit);
        }
      }
      this.units = Array.from(units).sort();
    }

    this.props.onDataUpdate(this.props.chartId, statData);
    this.setState({
      statData,
      ipccModels,
      isDataLoaded: true,
    });
  }

  /**
   * Draw chart in current svg container based on stats data.
   */
  private drawChart(): void {
    const dataGroupsDict = {};
    if (!this.state.statData) {
      return;
    }
    for (const place of this.state.statData.places) {
      dataGroupsDict[this.props.placeNameMap[place]] = getStatVarGroupWithTime(
        this.state.statData,
        place
      );
    }
    const modelsDataGroupsDict = {};
    if (this.state.ipccModels) {
      for (const place of this.state.ipccModels.places) {
        modelsDataGroupsDict[this.props.placeNameMap[place]] =
          getStatVarGroupWithTime(this.state.ipccModels, place);
      }
    }
    drawGroupLineChart(
      this.svgContainer.current,
      this.svgContainer.current.offsetWidth,
      CHART_HEIGHT,
      this.props.statVarInfos,
      dataGroupsDict,
      this.plotParams,
      {
        modelsDataGroupsDict,
        unit: this.units.join(", "),
        ylabel: this.ylabel(),
      }
    );
  }

  private ylabel(): string {
    // get mprop from one statVar
    const statVarSample = Object.keys(this.props.statVarInfos)[0];
    let mprop = this.props.statVarInfos[statVarSample].mprop;
    // ensure the mprop is the same for all the statVars
    for (const statVar in this.props.statVarInfos) {
      if (this.props.statVarInfos[statVar].mprop !== mprop) {
        mprop = "";
      }
    }
    // use mprop as the ylabel
    const ylabelText = mprop.charAt(0).toUpperCase() + mprop.slice(1);

    // Add units and per capita to the ylabel as a suffix, if provided
    // e.g. "StatVar (unit, per capita)"
    const suffixItems = this.units || [];
    if (this.props.pc) {
      suffixItems.push(
        intl.formatMessage(chartComponentMessages.perCapitaLowercase)
      );
    }
    if (!_.isEmpty(suffixItems)) {
      const suffix = `(${suffixItems.join(", ")})`;
      return ylabelText ? `${ylabelText} ${suffix}` : suffix;
    }
    return ylabelText;
  }
}

export { Chart };
