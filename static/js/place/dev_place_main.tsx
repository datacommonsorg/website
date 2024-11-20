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
  PlaceChartsApiResponse,
  RelatedPlacesApiResponse,
} from "@datacommonsorg/client/dist/data_commons_web_client_types";
import _ from "lodash";
import React, { useEffect, useState } from "react";

import { GoogleMap } from "../components/google_map";
import { NlSearchBar } from "../components/nl_search_bar";
import { SubjectPageMainPane } from "../components/subject_page/main_pane";
import { intl } from "../i18n/i18n";
import {
  GA_EVENT_NL_SEARCH,
  GA_PARAM_QUERY,
  GA_PARAM_SOURCE,
  GA_VALUE_SEARCH_SOURCE_PLACE_PAGE,
  triggerGAEvent,
} from "../shared/ga_events";
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

/**
 * Handler for NL search bar
 * @param q search query entered by user
 */
function onSearch(q: string): void {
  triggerGAEvent(GA_EVENT_NL_SEARCH, {
    [GA_PARAM_QUERY]: q,
    [GA_PARAM_SOURCE]: GA_VALUE_SEARCH_SOURCE_PLACE_PAGE,
  });
  window.location.href = `/explore#q=${encodeURIComponent(q)}`;
}

function placeChartsApiResponsesToPageConfig(
  placeChartsApiResponse: PlaceChartsApiResponse
) {
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
          statVarKey: chart.statisticalVariableDcids,
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
          statVarSpec[variableDcid] = {
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

export const SearchBar = () => {
  return (
    <NlSearchBar
      initialValue=""
      inputId="query-search-input"
      onSearch={onSearch}
      placeholder={intl.formatMessage({
        defaultMessage: "Enter a question to explore",
        description:
          "Text inviting user to search for data using a question in natural language",
        id: "nl-search-bar-placeholder-text",
      })}
      shouldAutoFocus={false}
    />
  );
};

const PlaceHeader = (props: {
  category: string;
  place: NamedTypedPlace;
  placeSubheader: string;
}) => {
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

const PlaceTopicTabs = ({
  category,
  place,
}: {
  category: string;
  place: NamedTypedPlace;
}) => {
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
              href={`/dev-place/${place.dcid}`}
            >
              Overview
            </a>
          </div>
          <div className="item-list-item">
            <a
              className={`item-list-text ${
                category === "Economics" ? "selected" : ""
              }`}
              href={`/dev-place/${place.dcid}?category=Economics`}
            >
              Economics
            </a>
          </div>
          <div className="item-list-item">
            <a
              className={`item-list-text ${
                category === "Health" ? "selected" : ""
              }`}
              href={`/dev-place/${place.dcid}?category=Health`}
            >
              Health
            </a>
          </div>
          <div className="item-list-item">
            <a
              className={`item-list-text ${
                category === "Equity" ? "selected" : ""
              }`}
              href={`/dev-place/${place.dcid}?category=Equity`}
            >
              Equity
            </a>
          </div>
          <div className="item-list-item">
            <a
              className={`item-list-text ${
                category === "Demographics" ? "selected" : ""
              }`}
              href={`/dev-place/${place.dcid}?category=Demographics`}
            >
              Demographics
            </a>
          </div>
          <div className="item-list-item">
            <a
              className={`item-list-text ${
                category === "Environment" ? "selected" : ""
              }`}
              href={`/dev-place/${place.dcid}?category=Environment`}
            >
              Environment
            </a>
          </div>
          <div className="item-list-item">
            <a
              className={`item-list-text ${
                category === "Energy" ? "selected" : ""
              }`}
              href={`/dev-place/${place.dcid}?category=Energy`}
            >
              Energy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlaceOverviewTable = (props: { placeDcid: string }) => {
  const { placeDcid } = props;
  const [dataRows, setDataRows] = useState<DataRow[]>([]);
  useEffect(() => {
    (async () => {
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
  return (
    <table className="table">
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
      </tbody>
    </table>
  );
};

const PlaceOverview = (props: {
  place: NamedTypedPlace;
  placeSummary: string;
}) => {
  const { place, placeSummary } = props;
  return (
    <div className="place-overview">
      <div className="place-icon">
        <div className="material-icons">location_city</div>
      </div>
      <div className="place-name">{place.name}</div>
      <div className="place-summary">{placeSummary}</div>
      <div className="row place-map">
        <div className="col-md-3">
          <GoogleMap dcid={place.dcid}></GoogleMap>
        </div>
        <div className="col-md-9">
          <PlaceOverviewTable placeDcid={place.dcid} />
        </div>
      </div>
    </div>
  );
};

const RelatedPlaces = (props: {
  place: NamedTypedPlace;
  childPlaces: NamedTypedPlace[];
}) => {
  const { place, childPlaces } = props;
  if (!childPlaces || childPlaces.length === 0) {
    return null;
  }
  return (
    <div className="related-places">
      <div className="related-places-callout">Places in {place.name}</div>
      <div className="item-list-container">
        <div className="item-list-inner">
          {childPlaces.map((place) => (
            <div key={place.dcid} className="item-list-item">
              <a className="item-list-text" href={`/dev-place/${place.dcid}`}>
                {place.name}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PlaceCharts = (props: {
  childPlaceType: string;
  place: NamedTypedPlace;
  pageConfig: SubjectPageConfig;
}) => {
  const { childPlaceType, place, pageConfig } = props;
  return (
    <div className="charts-container">
      <SubjectPageMainPane
        id="place-subject-page"
        place={place}
        pageConfig={pageConfig}
        defaultEnclosedPlaceType={childPlaceType}
      />
    </div>
  );
};

export const DevPlaceMain = () => {
  const [place, setPlace] = useState<NamedTypedPlace>();
  const [placeSummary, setPlaceSummary] = useState<string>();
  const [placeSubheader, setPlaceSubheader] = useState<string>();
  const [relatedPlacesApiResponse, setRelatedPlacesApiResponse] =
    useState<RelatedPlacesApiResponse>();
  const [placeChartsApiResponse, setPlaceChartsApiResponse] =
    useState<PlaceChartsApiResponse>();
  const [childPlaceType, setChildPlaceType] = useState<string>();
  const [childPlaces, setChildPlaces] = useState<NamedTypedPlace[]>([]);
  const [pageConfig, setPageConfig] = useState<SubjectPageConfig>();

  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get("category") || "Overview";

  useEffect(() => {
    const pageMetadata = document.getElementById("page-metadata");
    if (!pageMetadata) {
      console.error("Error loading place page metadata element");
      return;
    }
    setPlace({
      name: pageMetadata.dataset.placeName,
      dcid: pageMetadata.dataset.placeDcid,
      types: [],
    });
    setPlaceSummary(pageMetadata.dataset.placeSummary);
    setPlaceSubheader(pageMetadata.dataset.placeSubheader);
  }, []);

  useEffect(() => {
    if (!place) {
      return;
    }
    (async () => {
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
      setPageConfig(pageConfig);
    })();
  }, [place]);

  if (!place) {
    return <div>Loading...</div>;
  }
  return (
    <>
      <PlaceHeader
        category={category}
        place={place}
        placeSubheader={placeSubheader}
      />
      <PlaceTopicTabs category={category} place={place} />
      <PlaceOverview place={place} placeSummary={placeSummary} />
      <RelatedPlaces place={place} childPlaces={childPlaces} />
      {place && pageConfig && (
        <PlaceCharts
          place={place}
          childPlaceType={childPlaceType}
          pageConfig={pageConfig}
        />
      )}
    </>
  );
};
