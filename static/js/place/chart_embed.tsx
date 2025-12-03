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

/** @jsxImportSource @emotion/react */

//TODO (nick-next): Add the chart embed dialog to the screenshot test suite.

import { css, ThemeContext } from "@emotion/react";
import * as d3 from "d3";
import React, { ReactElement, RefObject } from "react";

import { wrap } from "../chart/base";
import { Button } from "../components/elements/button/button";
import { CopyToClipboardButton } from "../components/elements/button/copy_to_clipboard_button";
import { CodeBlock } from "../components/elements/code/code_block";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../components/elements/dialog/dialog";
import { Download } from "../components/elements/icons/download";
import {
  ASYNC_ELEMENT_CLASS,
  ASYNC_ELEMENT_HOLDER_CLASS,
} from "../constants/css_constants";
import { intl } from "../i18n/i18n";
import { chartComponentMessages } from "../i18n/i18n_chart_messages";
import { messages } from "../i18n/i18n_messages";
import { metadataComponentMessages } from "../i18n/i18n_metadata_messages";
import {
  GA_EVENT_TILE_DOWNLOAD_CSV,
  GA_EVENT_TILE_DOWNLOAD_IMG,
  triggerGAEvent,
} from "../shared/ga_events";
import { StatMetadata } from "../shared/stat_types";
import { StatVarFacetMap, StatVarSpec } from "../shared/types";
import { saveToFile, urlToDisplayText } from "../shared/util";
import { Theme } from "../theme/types";
import {
  buildCitationNodes,
  buildCitationParts,
  CitationPart,
} from "../tools/shared/metadata/citations";
import { fetchMetadata } from "../tools/shared/metadata/metadata_fetcher";
import { getDataCommonsClient } from "../utils/data_commons_client";
import { StatVarFacetDateRangeMap } from "../utils/tile_utils";

// SVG adjustment related constants
const TITLE_Y = 20;
const TITLE_MARGIN = 10;
const SOURCES_MARGIN = 30;
const CHART_PADDING = 10;
const SVGNS = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";

interface ChartEmbedPropsType {
  container?: HTMLElement;
  statVarSpecs?: StatVarSpec[];
  facets?: Record<string, StatMetadata>;
  statVarToFacets?: StatVarFacetMap;
  // A map of stat var dcids to facet IDs to their specific min and max date range from the chart
  statVarFacetDateRanges?: StatVarFacetDateRangeMap;
  apiRoot?: string;
}
interface ChartEmbedStateType {
  modal: boolean;
  loading: boolean;
  citation: CitationPart[];
  svgXml: string;
  dataCsv: string;
  chartDate: string;
  chartHeight: number;
  chartHtml: string;
  chartTitle: string;
  chartWidth: number;
  sources: string[];
  chartDownloadXml: string;
  getDataCsv?: () => Promise<string>;
  dataError: boolean;
}

/**
 * A component to include with each Chart, that displays embed information and data for a chart
 * in a Modal
 */
class ChartEmbed extends React.Component<
  ChartEmbedPropsType,
  ChartEmbedStateType
> {
  static contextType: React.Context<Theme> =
    ThemeContext as React.Context<Theme>;
  declare context: Theme;

  private readonly svgContainerElement: React.RefObject<HTMLDivElement>;
  private readonly containerRef: RefObject<HTMLElement>;

  constructor(props: unknown) {
    super(props);
    this.state = {
      modal: false,
      loading: false,
      citation: [],
      svgXml: "",
      dataCsv: "",
      chartDate: "",
      chartHeight: 0,
      chartHtml: "",
      chartTitle: "",
      chartWidth: 0,
      sources: [],
      chartDownloadXml: "",
      getDataCsv: undefined,
      dataError: false,
    };
    this.svgContainerElement = React.createRef();
    this.containerRef = React.createRef();

    if (this.containerRef.current !== this.props.container) {
      (
        this.containerRef as React.MutableRefObject<HTMLElement | null>
      ).current = this.props.container;
    }

    this.toggle = this.toggle.bind(this);
    this.onOpened = this.onOpened.bind(this);
    this.onDownloadSvg = this.onDownloadSvg.bind(this);
    this.onDownloadData = this.onDownloadData.bind(this);
  }

  componentDidUpdate(prevProps: ChartEmbedPropsType): void {
    if (this.props.container !== prevProps.container) {
      (
        this.containerRef as React.MutableRefObject<HTMLElement | null>
      ).current = this.props.container;
    }
  }

  /**
   * Toggles the view state of the modal.
   */
  public toggle(): void {
    this.setState({
      modal: !this.state.modal,
    });
  }

  /**
   * Updates the view state of the modal to true, and includes the data necessary for displaying the modal.
   */
  public show(
    svgXml: string,
    getDataCsv: () => Promise<string>,
    chartWidth: number,
    chartHeight: number,
    chartHtml: string,
    chartTitle: string,
    chartDate: string,
    sources: string[],
    surface: string
  ): void {
    if (this.state.modal) {
      return;
    }
    this.setState(
      {
        chartWidth,
        chartHeight,
        chartHtml,
        chartTitle,
        chartDate,
        // Clear cached dataCSV to force CSV to refresh
        dataCsv: "",
        getDataCsv,
        dataError: false,
        modal: true,
        loading: true,
        citation: [],
        sources,
        svgXml,
      },
      () => this.loadModalData(getDataCsv, surface)
    );
  }

  /**
   * Callback for after the modal has been rendered and added to the DOM.
   */
  public onOpened(): void {
    if (!this.svgContainerElement.current) {
      return;
    }

    if (this.state.chartHtml) {
      const chartDownloadXml = this.decorateChartHtml();
      const imageElement = document.createElement("img");
      imageElement.src =
        "data:image/svg+xml," + encodeURIComponent(chartDownloadXml);
      this.svgContainerElement.current.append(imageElement);
      imageElement.className = ASYNC_ELEMENT_CLASS;
      this.setState({ chartDownloadXml });
    }

    if (this.state.svgXml) {
      const chartDownloadXml = this.decorateSvgChart();
      const imageElement = document.createElement("img");
      imageElement.src =
        "data:image/svg+xml," + encodeURIComponent(chartDownloadXml);
      imageElement.className = ASYNC_ELEMENT_CLASS;
      this.svgContainerElement.current.append(imageElement);
      this.setState({ chartDownloadXml });
    }
  }

  /**
   * On click handler for "Copy SVG to clipboard button".
   */
  public onDownloadSvg(): void {
    triggerGAEvent(GA_EVENT_TILE_DOWNLOAD_IMG, {});
    const basename = this.state.chartTitle || "chart";
    saveToFile(`${basename}.svg`, this.state.chartDownloadXml);
  }

  /**
   * On click handler for "Download Data" button.
   */
  public onDownloadData(): void {
    triggerGAEvent(GA_EVENT_TILE_DOWNLOAD_CSV, {});
    const basename = this.state.chartTitle || "export";
    saveToFile(`${basename}.csv`, this.state.dataCsv);
  }

  public render(): ReactElement {
    const theme = this.context;

    return (
      <Dialog
        open={this.state.modal}
        onClose={this.toggle}
        maxWidth="lg"
        fullWidth
        containerRef={this.containerRef}
        loading={this.state.loading}
      >
        <DialogTitle>
          {intl.formatMessage(chartComponentMessages.ChartDownloadDialogTitle)}
        </DialogTitle>
        <DialogContent>
          <div
            css={css`
              display: grid;
              grid-template-columns: 0.3fr 0.7fr;
              grid-template-rows: minmax(220px, 260px);
              width: 100%;
              gap: ${theme.spacing.lg}px;
              @media (max-width: ${theme.breakpoints.md}px) {
                grid-template-columns: 1fr;
                grid-template-rows: 1fr 1fr;
              }
            `}
          >
            <div
              ref={this.svgContainerElement}
              className={`${ASYNC_ELEMENT_HOLDER_CLASS}`}
              css={css`
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                border: 1px solid ${theme.colors.border.primary.light};
                ${theme.radius.tertiary};
                padding: ${theme.spacing.md}px;
                & > svg,
                & > img {
                  display: block;
                  width: 100%;
                  height: auto;
                  max-height: 220px;
                  object-fit: contain;
                }
              `}
            ></div>
            <CodeBlock
              language="csv"
              code={this.state.dataCsv}
              css={css`
                width: 100%;
                height: 100%;
                overflow-x: auto;
                overflow-y: auto;

                pre,
                code {
                  white-space: pre;
                }
              `}
            />
          </div>
          {this.state.citation.length > 0 && (
            <div
              css={css`
                width: 100%;
                && {
                  h3 {
                    ${theme.typography.family.heading}
                    ${theme.typography.heading.xs}
                    margin: 0 0 ${theme.spacing.sm}px 0;
                    padding: 0 0 0 0;
                  }
                  p {
                    ${theme.typography.family.text}
                    ${theme.typography.text.md}
                    white-space: pre-wrap;
                    word-break: break-word;
                    a {
                      white-space: pre-wrap;
                      word-break: break-word;
                    }
                  }
                }
              `}
            >
              <h3>
                {intl.formatMessage(
                  metadataComponentMessages.SourceAndCitation
                )}
              </h3>
              <p>{buildCitationNodes(this.state.citation)}</p>
              <p>
                {intl.formatMessage(metadataComponentMessages.PleaseCredit)}
              </p>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={this.toggle}>
            {intl.formatMessage(messages.close)}
          </Button>
          {this.state.chartDownloadXml && (
            <Button startIcon={<Download />} onClick={this.onDownloadSvg}>
              {intl.formatMessage(chartComponentMessages.DownloadSVG)}
            </Button>
          )}
          {!this.state.dataError && (
            <>
              <Button startIcon={<Download />} onClick={this.onDownloadData}>
                {intl.formatMessage(chartComponentMessages.DownloadCSV)}
              </Button>
              <CopyToClipboardButton valueToCopy={this.state.dataCsv}>
                {intl.formatMessage(chartComponentMessages.CopyValues)}
              </CopyToClipboardButton>
            </>
          )}
        </DialogActions>
      </Dialog>
    );
  }

  /**
   * Fetches CSV data and citation metadata when the dialog is opened.
   */
  private async loadModalData(
    getDataCsv: () => Promise<string>,
    surface: string
  ): Promise<void> {
    let dataCsv: string;
    let dataFetchError = false;

    try {
      dataCsv = await getDataCsv();
      if (!dataCsv) {
        dataFetchError = true;
        console.error("Error fetching data: Result was empty.");
        dataCsv = intl.formatMessage(chartComponentMessages.DataError);
      }
    } catch (error) {
      dataFetchError = true;
      console.error("Error fetching data");
      dataCsv = intl.formatMessage(chartComponentMessages.DataError);
    }

    let citation: CitationPart[];
    try {
      const getCitationPromise = async (): Promise<CitationPart[]> => {
        const {
          statVarSpecs,
          facets,
          statVarToFacets,
          apiRoot,
          statVarFacetDateRanges,
        } = this.props;
        if (!statVarSpecs || !facets || !statVarToFacets) {
          return [];
        }
        const statVarSet = new Set<string>();
        for (const spec of statVarSpecs) {
          statVarSet.add(spec.statVar);
          if (spec.denom) {
            statVarSet.add(spec.denom);
          }
        }
        if (statVarSet.size === 0) {
          return [];
        }
        const dataCommonsClient = getDataCommonsClient(apiRoot, surface);
        const metadataResp = await fetchMetadata(
          statVarSet,
          facets,
          dataCommonsClient,
          statVarToFacets,
          apiRoot
        );
        return buildCitationParts(
          metadataResp.statVarList,
          metadataResp.metadata,
          statVarFacetDateRanges
        );
      };
      citation = await getCitationPromise();
    } catch (error) {
      console.error("Error loading citation");
      citation = [];
    }
    this.setState(
      {
        dataCsv,
        citation,
        dataError: dataFetchError,
        loading: false,
      },
      () => {
        this.onOpened();
      }
    );
  }

  /**
   * Decorates chartHtml with title and provenance information embeded in an enclosing
   * SVG node. Returns the SVG contents as a string.
   */
  private decorateChartHtml(): string {
    // TODO: Merge this function with decorateSvgChart for less code duplication
    const container = this.svgContainerElement.current;
    container.innerHTML = "";
    const chartWidth = this.state.chartWidth + 2 * CHART_PADDING;

    // Decorate a hidden chart svg with title and provenance
    const svg = d3
      .select(container)
      .append("svg")
      .attr("xmlns", SVGNS)
      .attr("xmlns:xlink", XLINKNS)
      .attr("width", chartWidth);

    const title = svg
      .append("g")
      .append("text")
      .style("font-family", "sans-serif")
      .style("fill", "#3b3b3b")
      .style("font-size", ".85rem")
      .style("font-weight", "bold")
      .style("text-anchor", "middle")
      .text(`${this.state.chartTitle} ${this.state.chartDate}`)
      .call(wrap, this.state.chartWidth);
    const titleHeight = title.node().getBBox().height;
    title.attr("transform", `translate(${chartWidth / 2}, ${TITLE_Y})`);

    svg
      .append("g")
      .attr(
        "transform",
        `translate(${CHART_PADDING}, ${titleHeight + TITLE_MARGIN})`
      )
      .append("svg")
      .append("foreignObject")
      .attr("width", chartWidth)
      .attr("height", 500)
      .append("xhtml:div")
      .style("font", "14px 'Helvetica Neue'")
      .html(this.state.chartHtml);

    const sources = svg
      .append("g")
      .attr(
        "transform",
        `translate(${CHART_PADDING}, ${
          titleHeight + TITLE_MARGIN + this.state.chartHeight + SOURCES_MARGIN
        })`
      )
      .append("text")
      .style("fill", "#3b3b3b")
      .style("font-family", "sans-serif")
      .style("font-size", ".7rem")
      .text(
        intl.formatMessage(
          {
            id: "embed_citation",
            defaultMessage: "Data from {sources} via Data Commons",
            description:
              'Used to cite where the data is from, but that it was provided through Data Commons. For example, "Data from {nytimes.com} via Data Commons" or "Data from {census.gov, nytimes.com} via Data Commons". Please keep the name "Data Commons".',
          },
          {
            sources: this.state.sources
              .map((s) => urlToDisplayText(s))
              .join(", "),
          }
        )
      )
      .call(wrap, this.state.chartWidth);

    const sourcesHeight = sources.node().getBBox().height;
    svg.attr(
      "height",
      this.state.chartHeight +
        titleHeight +
        TITLE_MARGIN +
        sourcesHeight +
        SOURCES_MARGIN
    );
    const s = new XMLSerializer();
    const svgXml = s.serializeToString(svg.node());
    container.innerHTML = "";

    return svgXml;
  }

  /**
   * Decorates svgXml with title and provenance information embeded in an enclosing
   * SVG node. Returns the SVG contents as a string.
   */
  private decorateSvgChart(): string {
    const container = this.svgContainerElement.current;
    container.innerHTML = "";
    const chartWidth = this.state.chartWidth + 2 * CHART_PADDING;

    // Decorate a hidden chart svg with title and provenance
    const svg = d3
      .select(container)
      .append("svg")
      .attr("xmlns", SVGNS)
      .attr("xmlns:xlink", XLINKNS)
      .attr("width", chartWidth);

    const title = svg
      .append("g")
      .append("text")
      .style("font-family", "sans-serif")
      .style("fill", "#3b3b3b")
      .style("font-size", ".85rem")
      .style("font-weight", "bold")
      .style("text-anchor", "middle")
      .text(`${this.state.chartTitle} ${this.state.chartDate}`)
      .call(wrap, this.state.chartWidth);
    const titleHeight = title.node().getBBox().height;
    title.attr("transform", `translate(${chartWidth / 2}, ${TITLE_Y})`);

    svg
      .append("g")
      .attr(
        "transform",
        `translate(${CHART_PADDING}, ${titleHeight + TITLE_MARGIN})`
      )
      .append("svg")
      .html(this.state.svgXml);

    const sources = svg
      .append("g")
      .attr(
        "transform",
        `translate(${CHART_PADDING}, ${
          titleHeight + TITLE_MARGIN + this.state.chartHeight + SOURCES_MARGIN
        })`
      )
      .append("text")
      .style("fill", "#3b3b3b")
      .style("font-family", "sans-serif")
      .style("font-size", ".7rem")
      .text(
        intl.formatMessage(
          {
            id: "embed_citation",
            defaultMessage: "Data from {sources} via Data Commons",
            description:
              'Used to cite where the data is from, but that it was provided through Data Commons. For example, "Data from {nytimes.com} via Data Commons" or "Data from {census.gov, nytimes.com} via Data Commons". Please keep the name "Data Commons".',
          },
          {
            sources: this.state.sources
              .map((s) => urlToDisplayText(s))
              .join(", "),
          }
        )
      )
      .call(wrap, this.state.chartWidth);

    const sourcesHeight = sources.node().getBBox().height;
    svg.attr(
      "height",
      this.state.chartHeight +
        titleHeight +
        TITLE_MARGIN +
        sourcesHeight +
        SOURCES_MARGIN
    );
    const s = new XMLSerializer();
    const svgXml = s.serializeToString(svg.node());
    container.innerHTML = "";

    return svgXml;
  }
}

export { ChartEmbed };
