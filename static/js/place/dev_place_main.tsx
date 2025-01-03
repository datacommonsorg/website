/**
 * Copyright 2024 Google LLC
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

import { DataRow } from "@datacommonsorg/client";
import {
  Chart,
  PlaceChartsApiResponse,
  RelatedPlacesApiResponse,
} from "@datacommonsorg/client/dist/data_commons_web_client_types";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { RawIntlProvider } from "react-intl";

import { LoadingHeader } from "../components/tiles/loading_header";
import { GoogleMap } from "../components/google_map";
import { SubjectPageMainPane } from "../components/subject_page/main_pane";
import { intl } from "../i18n/i18n";
import { NamedTypedPlace, StatVarSpec } from "../shared/types";
import {
  CategoryConfig,
  SubjectPageConfig,
  TileConfig,
} from "../types/subject_page_proto_types";
import {
  defaultDataCommonsClient,
  defaultDataCommonsWebClient,
} from "../utils/data_commons_client";
import { TileSources } from "../utils/tile_utils";
import { isPlaceContainedInUsa } from "./util";

/**
 * Returns the stat var key for a chart.
 *
 * A stat var key is a unique identifier for a statistical variable for the
 * given chart, including its DCID, denominator, log, scaling, and unit.
 *
 * @param chart The chart object
 * @param variableDcid The variable DCID
 * @param denom The denominator DCID
 * @returns The stat var key
 */
function getStatVarKey(
  chart: Chart,
  variableDcid: string,
  denom?: string
): string {
  return `${variableDcid}_denom_${denom}_log_${false}_scaling_${
    chart.scaling
  }_unit_${chart.unit}`;
}

/**
 * Converts the API response from getPlaceCharts into a SubjectPageConfig object.
 * Groups charts by category and creates the necessary configuration objects for
 * rendering the subject page.
 *
 * @param placeChartsApiResponse The API response containing chart data
 * @returns A SubjectPageConfig object with categories, tiles, and stat var specs
 */
function placeChartsApiResponsesToPageConfig(
  placeChartsApiResponse: PlaceChartsApiResponse
): SubjectPageConfig {
  const chartsByCategory = _.groupBy(
    placeChartsApiResponse.charts,
    (item) => item.category
  );
  const categoryConfig: CategoryConfig[] = Object.keys(chartsByCategory).map(
    (categoryName) => {
      const charts = chartsByCategory[categoryName];

      const tiles: TileConfig[] = charts.map((chart) => {
        return {
          description: chart.description,
          title: chart.title,
          type: chart.type,
          statVarKey: chart.statisticalVariableDcids.map(
            (variableDcid, variableIdx) => {
              const denom =
                chart.denominator &&
                chart.denominator.length ===
                  chart.statisticalVariableDcids.length
                  ? chart.denominator[variableIdx]
                  : undefined;
              return getStatVarKey(chart, variableDcid, denom);
            }
          ),
        };
      });

      const statVarSpec: Record<string, StatVarSpec> = {};
      charts.forEach((chart) => {
        chart.statisticalVariableDcids.forEach((variableDcid, variableIdx) => {
          const denom =
            chart.denominator &&
            chart.denominator.length === chart.statisticalVariableDcids.length
              ? chart.denominator[variableIdx]
              : undefined;
          const statVarKey = getStatVarKey(chart, variableDcid, denom);
          statVarSpec[statVarKey] = {
            denom,
            log: false,
            scaling: chart.scaling,
            statVar: variableDcid,
            unit: chart.unit,
          };
        });
      });

      // Group tiles into pairs to show a two-column layout
      const column1Tiles: TileConfig[] = [];
      const column2Tiles: TileConfig[] = [];
      tiles.forEach((tile, index) => {
        if (index % 2 === 0) {
          column1Tiles.push(tile);
        } else {
          column2Tiles.push(tile);
        }
      });
      const category: CategoryConfig = {
        blocks: [
          {
            columns: [{ tiles }],
          },
        ],
        statVarSpec,
        title: categoryName,
      };
      return category;
    }
  );

  const pageConfig: SubjectPageConfig = {
    metadata: undefined,
    categories: categoryConfig,
  };
  return pageConfig;
}

/**
 * Component that renders the header section of a place page.
 * Displays the place name, category (if not Overview), and subheader text.
 * Also shows the place DCID with a link to view it in the Knowledge Graph browser.
 *
 * @param props.category The current category being viewed
 * @param props.place The place object containing name and DCID
 * @param props.placeSubheader HTML string with additional place context
 * @returns Header component for the place page
 */
const PlaceHeader = (props: {
  category: string;
  place: NamedTypedPlace;
  placeSubheader: string;
}): React.JSX.Element => {
  const { category, place, placeSubheader } = props;
  return (
    <div className="title-section">
      <div className="place-info">
        <h1>
          {place.name}
          {category != "Overview" ? ` • ${category}` : ""}{" "}
        </h1>
        <p
          className="subheader"
          dangerouslySetInnerHTML={{ __html: placeSubheader }}
        ></p>
      </div>
      <div className="dcid-and-knowledge-graph">
        dcid: {place.dcid} •{" "}
        <a href={`/browser/${place.dcid}`}>See Knowledge Graph</a>
      </div>
    </div>
  );
};

/**
 * Component that renders the topic navigation tabs.
 * Shows tabs for Overview and different categories like Economics, Health, etc.
 * Highlights the currently selected category.
 *
 * @param props.category The currently selected category
 * @param props.place The place object containing the DCID for generating URLs
 * @returns Navigation component with topic tabs
 */
const PlaceTopicTabs = ({
  forceDevPlaces,
  category,
  place,
}: {
  forceDevPlaces: boolean;
  category: string;
  place: NamedTypedPlace;
}): React.JSX.Element => {
  return (
    <div className="explore-topics-box">
      <span className="explore-relevant-topics">Relevant topics</span>
      <div className="item-list-container">
        <div className="item-list-inner">
          <div className="item-list-item">
            <a
              className={`item-list-text ${
                category === "Overview" ? "selected" : ""
              }`}
              href={`/place/${place.dcid}${
                forceDevPlaces ? "?force_dev_places=true" : ""
              }`}
            >
              Overview
            </a>
          </div>
          <div className="item-list-item">
            <a
              className={`item-list-text ${
                category === "Economics" ? "selected" : ""
              }`}
              href={`/place/${place.dcid}?category=Economics${
                forceDevPlaces ? "&force_dev_places=true" : ""
              }`}
            >
              Economics
            </a>
          </div>
          <div className="item-list-item">
            <a
              className={`item-list-text ${
                category === "Health" ? "selected" : ""
              }`}
              href={`/place/${place.dcid}?category=Health${
                forceDevPlaces ? "&force_dev_places=true" : ""
              }`}
            >
              Health
            </a>
          </div>
          <div className="item-list-item">
            <a
              className={`item-list-text ${
                category === "Equity" ? "selected" : ""
              }`}
              href={`/place/${place.dcid}?category=Equity${
                forceDevPlaces ? "&force_dev_places=true" : ""
              }`}
            >
              Equity
            </a>
          </div>
          <div className="item-list-item">
            <a
              className={`item-list-text ${
                category === "Demographics" ? "selected" : ""
              }`}
              href={`/place/${place.dcid}?category=Demographics${
                forceDevPlaces ? "&force_dev_places=true" : ""
              }`}
            >
              Demographics
            </a>
          </div>
          <div className="item-list-item">
            <a
              className={`item-list-text ${
                category === "Environment" ? "selected" : ""
              }`}
              href={`/place/${place.dcid}?category=Environment${
                forceDevPlaces ? "&force_dev_places=true" : ""
              }`}
            >
              Environment
            </a>
          </div>
          <div className="item-list-item">
            <a
              className={`item-list-text ${
                category === "Energy" ? "selected" : ""
              }`}
              href={`/place/${place.dcid}?category=Energy${
                forceDevPlaces ? "&force_dev_places=true" : ""
              }`}
            >
              Energy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Component that displays a table of key demographic statistics for a place.
 *
 * Fetches data for population, median income, median age, unemployment rate,
 * and crime statistics using the Data Commons API. Displays the values in a
 * formatted table with units and dates.
 *
 * @param props.placeDcid The DCID of the place to show statistics for
 * @returns A table component showing key demographic statistics, or null if data not loaded
 */
const PlaceOverviewTable = (props: {
  placeDcid: string;
}): React.JSX.Element => {
  const { placeDcid } = props;
  const [dataRows, setDataRows] = useState<DataRow[]>([]);
  const containerRef = useRef(null);
  // Fetch key demographic statistics for the place when it changes
  useEffect(() => {
    (async (): Promise<void> => {
      const placeOverviewDataRows = await defaultDataCommonsClient.getDataRows({
        entities: [placeDcid],
        variables: [
          "Count_Person",
          "Median_Income_Person",
          "Median_Age_Person",
          "UnemploymentRate_Person",
          "Count_CriminalActivities_CombinedCrime",
        ],
        perCapitaVariables: ["Count_CriminalActivities_CombinedCrime"],
      });
      setDataRows(placeOverviewDataRows);
    })();
  }, [placeDcid]);
  if (!dataRows) {
    return null;
  }
  const sourceUrls = new Set(
    dataRows.map((dataRow) => {
      return dataRow.variable.observation.metadata.provenanceUrl;
    })
  );
  const statVarDcids = dataRows.map((dr) => {
    return dr.variable.dcid;
  });

  const statVarSpecs: StatVarSpec[] = statVarDcids.map((dcid) => {
    return {
      statVar: dcid,
      denom: "", // Initialize with an empty string or a default denominator if applicable
      unit: "", // Initialize with an empty string or a default unit if applicable
      scaling: 1, // Initialize with a default scaling factor
      log: false, // Initialize with a default log value
    };
  });

  return (
    <table className="table" ref={containerRef}>
      <thead>
        <tr>
          <th scope="col" colSpan={2}>
            Key Demographics
          </th>
          <th scope="col"></th>
        </tr>
      </thead>
      <tbody>
        {dataRows.map((dataRow, index) => {
          const unit = dataRow.variable.observation.metadata.unitDisplayName
            ? dataRow.variable.observation.metadata.unitDisplayName
            : "";
          const formattedObservationValue =
            dataRow.variable.observation.value.toLocaleString();
          return (
            <tr key={index}>
              <td>{dataRow.variable.properties.name}</td>
              <td>
                {formattedObservationValue} {unit} (
                {dataRow.variable.observation.date})
              </td>
              <td></td>
            </tr>
          );
        })}
        {dataRows && (
          <tr>
            <td>
              <div className="chart-container">
                <TileSources
                  containerRef={containerRef}
                  sources={sourceUrls}
                  statVarSpecs={statVarSpecs}
                />
              </div>
            </td>
            <td></td>
            <td></td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

/**
 * Displays an overview of a place including its name, summary, map and key statistics.
 *
 * @param props.place The place object containing name and dcid
 * @param props.placeSummary A text summary describing the place
 * @returns A component with the place overview including icon, name, summary, map and statistics table
 */
const PlaceOverview = (props: {
  place: NamedTypedPlace;
  placeSummary: string;
  parentPlaces: NamedTypedPlace[];
}): React.JSX.Element => {
  const { place, placeSummary, parentPlaces } = props;
  const isInUsa = isPlaceContainedInUsa(
    parentPlaces.map((place) => place.dcid)
  );
  return (
    <div className="place-overview">
      <div className="place-icon">
        <div className="material-icons">location_city</div>
      </div>
      <div className="place-name">{place.name}</div>
      <div className="place-summary">{placeSummary}</div>
      <div className="row place-map">
        {isInUsa && (
          <div className="col-md-3">
            <GoogleMap dcid={place.dcid}></GoogleMap>
          </div>
        )}
        <div className="col-md-9">
          {!isInUsa && <br></br>}
          <PlaceOverviewTable placeDcid={place.dcid} />
        </div>
      </div>
    </div>
  );
};

/**
 * Component that displays a list of child places for a given place.
 *
 * @param props.place The parent place containing name and dcid
 * @param props.childPlaces Array of child places, each with name and dcid
 * @returns A list of links to child places, or null if no child places exist
 */
const RelatedPlaces = (props: {
  place: NamedTypedPlace;
  childPlaces: NamedTypedPlace[];
}): React.JSX.Element => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { place, childPlaces } = props;
  if (!childPlaces || childPlaces.length === 0) {
    return null;
  }

  const NUM_PLACES = 15;
  const showToggle = childPlaces.length > NUM_PLACES;
  const truncatedPlaces = childPlaces.slice(0, NUM_PLACES);
  const numPlacesCollapsed = childPlaces.length - NUM_PLACES;

  const toggleShowMore = (): void => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="related-places">
      <div className="related-places-callout">Places in {place.name}</div>
      <div className="item-list-container">
        <div className="item-list-inner">
          {(isCollapsed ? truncatedPlaces : childPlaces).map((place) => (
            <div key={place.dcid} className="item-list-item">
              <a className="item-list-text" href={`/place/${place.dcid}`}>
                {place.name}
              </a>
            </div>
          ))}
        </div>
      </div>
      {showToggle && (
        <div className="show-more-toggle" onClick={toggleShowMore}>
          <span className="show-more-toggle-text">
            {isCollapsed ? `Show ${numPlacesCollapsed} more` : "Show less"}
          </span>
          <span className="material-icons-outlined">
            {isCollapsed ? "expand_more" : "expand_less"}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Component that renders charts for a place using the SubjectPageMainPane.
 *
 * @param props.childPlaceType The type of child places (e.g. "State", "County")
 * @param props.place The place object containing name, dcid and types
 * @param props.pageConfig Configuration for the subject page including chart categories and specs
 * @returns Component with charts for the place
 */
const PlaceCharts = (props: {
  childPlaceType: string;
  place: NamedTypedPlace;
  pageConfig: SubjectPageConfig;
}): React.JSX.Element => {
  const { childPlaceType, place, pageConfig } = props;
  return (
    <div className="charts-container">
      <SubjectPageMainPane
        defaultEnclosedPlaceType={childPlaceType}
        id="place-subject-page"
        pageConfig={pageConfig}
        place={place}
        showExploreMore={true}
      />
    </div>
  );
};

/**
 * Main component for the dev place page. Manages state and data fetching for place information,
 * related places, and chart data.
 */
export const DevPlaceMain = (): React.JSX.Element => {
  const overview_string = "Overview";
  // Core place data
  const [place, setPlace] = useState<NamedTypedPlace>();
  const [placeSummary, setPlaceSummary] = useState<string>();
  const [placeSubheader, setPlaceSubheader] = useState<string>();

  // API response data
  const [relatedPlacesApiResponse, setRelatedPlacesApiResponse] =
    useState<RelatedPlacesApiResponse>();
  const [placeChartsApiResponse, setPlaceChartsApiResponse] =
    useState<PlaceChartsApiResponse>();

  // Derived place data
  const [childPlaceType, setChildPlaceType] = useState<string>();
  const [childPlaces, setChildPlaces] = useState<NamedTypedPlace[]>([]);
  const [parentPlaces, setParentPlaces] = useState<NamedTypedPlace[]>([]);
  const [pageConfig, setPageConfig] = useState<SubjectPageConfig>();
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get("category") || overview_string;
  const isOverview = category === overview_string;
  const forceDevPlaces = urlParams.get("force_dev_places") === "true";
  const hasPlaceCharts = place && pageConfig && pageConfig.categories.length > 0;
  const hasNoCharts = place && pageConfig && pageConfig.categories.length == 0 && !isLoading;

  /**
   * On initial load, get place metadata from the page's metadata element
   * and set up initial place state.
   */
  useEffect(() => {
    const pageMetadata = document.getElementById("page-metadata");
    if (!pageMetadata) {
      console.error("Error loading place page metadata element");
      return;
    }
    if (!isLoading &&
      pageMetadata.dataset.placeDcid != "" &&
      pageMetadata.dataset.placeName === ""
    ) {
      setHasError(true);
    }
    setPlace({
      name: pageMetadata.dataset.placeName,
      dcid: pageMetadata.dataset.placeDcid,
      types: [],
    });
    setPlaceSummary(pageMetadata.dataset.placeSummary);
    setPlaceSubheader(pageMetadata.dataset.placeSubheader);
  }, []);

  /**
   * Once we have place data, fetch chart and related places data from the API.
   * Updates state with API responses and derived data.
   */
  useEffect(() => {
    if (!place) {
      return;
    }
    setIsLoading(true);
    (async (): Promise<void> => {
      const [placeChartsApiResponse, relatedPlacesApiResponse] =
        await Promise.all([
          defaultDataCommonsWebClient.getPlaceCharts({
            category,
            placeDcid: place.dcid,
          }),
          defaultDataCommonsWebClient.getRelatedPLaces({
            placeDcid: place.dcid,
          }),
        ]);

      setPlaceChartsApiResponse(placeChartsApiResponse);
      setRelatedPlacesApiResponse(relatedPlacesApiResponse);
      const pageConfig = placeChartsApiResponsesToPageConfig(
        placeChartsApiResponse
      );
      setChildPlaceType(relatedPlacesApiResponse.childPlaceType);
      setChildPlaces(relatedPlacesApiResponse.childPlaces);
      setParentPlaces(relatedPlacesApiResponse.parentPlaces);
      setPageConfig(pageConfig);
      setIsLoading(false);
    })();
  }, [place]);

  if (!place) {
    return <div>Loading...</div>;
  }
  if (hasError) {
    return <div>Place &quot;{place.dcid}&quot; not found.</div>;
  }
  return (
    <RawIntlProvider value={intl}>
      <PlaceHeader
        category={category}
        place={place}
        placeSubheader={placeSubheader}
      />
      <PlaceTopicTabs
        category={category}
        place={place}
        forceDevPlaces={forceDevPlaces}
      />
      {isOverview && placeSummary != "" && (
        <PlaceOverview
          place={place}
          placeSummary={placeSummary}
          parentPlaces={parentPlaces}
        />
      )}
      {isOverview && childPlaces.length > 0 && (
        <RelatedPlaces place={place} childPlaces={childPlaces} />
      )}
      {isLoading && <LoadingHeader isLoading={true} />}
      {hasPlaceCharts && (
        <PlaceCharts
          place={place}
          childPlaceType={childPlaceType}
          pageConfig={pageConfig}
        />
      )}
      {hasNoCharts && (
        <div>
          No {category === overview_string ? "" : category} data found for{" "}
          {place.name}.
        </div>
      )}
    </RawIntlProvider>
  );
};
