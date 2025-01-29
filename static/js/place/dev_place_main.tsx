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
/** @jsxImportSource @emotion/react */

import {
  Category,
  PlaceChartsApiResponse,
  PlaceOverviewTableApiResponse,
  RelatedPlacesApiResponse,
} from "@datacommonsorg/client/dist/data_commons_web_client_types";
import { ThemeProvider } from "@emotion/react";
import React, { useEffect, useState } from "react";
import { RawIntlProvider } from "react-intl";

import { ScrollToTopButton } from "../components/elements/scroll_to_top_button";
import { SubjectPageMainPane } from "../components/subject_page/main_pane";
import { intl, LocalizedLink } from "../i18n/i18n";
import { useQueryStore } from "../shared/stores/query_store_hook";
import {
  isFeatureEnabled,
  SCROLL_TO_TOP_FEATURE_FLAG,
} from "../shared/feature_flags/util";
import { NamedTypedPlace } from "../shared/types";
import theme from "../theme/theme";
import { SubjectPageConfig } from "../types/subject_page_proto_types";
import { defaultDataCommonsWebClient } from "../utils/data_commons_client";
import { PlaceOverview } from "./dev_place_overview";
import {
  createPlacePageCategoryHref,
  pageMessages,
  placeChartsApiResponsesToPageConfig,
} from "./util";

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
          <span>
            {category === "Overview" ? (
              place.name
            ) : (
              <a className="place-info-link" href={`/place/${place.dcid}`}>
                {place.name}
              </a>
            )}
            {category != "Overview" ? ` • ${category}` : ""}{" "}
          </span>
          <div className="dcid-and-knowledge-graph">
            {intl.formatMessage(pageMessages.KnowledgeGraph)} •{" "}
            <a href={`/browser/${place.dcid}`}>{place.dcid}</a>
          </div>
        </h1>
        <p
          className="subheader"
          dangerouslySetInnerHTML={{ __html: placeSubheader }}
        ></p>
      </div>
    </div>
  );
};

/**
 * Component that renders the individual topic navigation buttons.
 * Shows buttons for the topics created and highlights the currently selected category.
 *
 * @param props.category The category for the current button
 * @param props.selectedCategory The currently selected category
 * @param props.forceDevPlaces Whether the flag to force dev places should be propagated.
 * @param props.place The place object containing the DCID for generating URLs
 * @returns Button component for the current topic
 */
const CategoryItem = (props: {
  category: Category;
  selectedCategory: string;
  forceDevPlaces: boolean;
  place: NamedTypedPlace;
}): React.JSX.Element => {
  const { category, selectedCategory, forceDevPlaces, place } = props;

  return (
    <div className="item-list-item">
      <LocalizedLink
        href={createPlacePageCategoryHref(category.name, forceDevPlaces, place)}
        className={`item-list-text ${
          selectedCategory === category.name ? " selected" : ""
        }`}
        text={category.translatedName}
      />
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
const PlaceCategoryTabs = ({
  categories,
  forceDevPlaces,
  selectedCategory,
  place,
}: {
  categories: Category[];
  forceDevPlaces: boolean;
  selectedCategory: string;
  place: NamedTypedPlace;
}): React.JSX.Element => {
  if (!categories || categories.length == 0) {
    return <></>;
  }

  return (
    <div className="explore-topics-box">
      <span className="explore-relevant-topics">
        {intl.formatMessage(pageMessages.RelevantTopics)}
      </span>
      <div className="item-list-container">
        <div className="item-list-inner">
          {categories.map((category) => (
            <CategoryItem
              key={category.name}
              category={category}
              selectedCategory={selectedCategory}
              forceDevPlaces={forceDevPlaces}
              place={place}
            />
          ))}
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

  const NUM_PLACES = 100;
  const showToggle = childPlaces.length > NUM_PLACES;
  const truncatedPlaces = childPlaces.slice(0, NUM_PLACES);
  const numPlacesCollapsed = childPlaces.length - NUM_PLACES;

  const toggleShowMore = (): void => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="related-places">
      <div className="related-places-callout">
        {intl.formatMessage(pageMessages.placesInPlace, {
          placeName: place.name,
        })}
      </div>
      <div className="item-list-container">
        <div className="item-list-inner">
          {(isCollapsed ? truncatedPlaces : childPlaces).map((place) => (
            <div key={place.dcid} className="item-list-item">
              <LocalizedLink
                className="item-list-text"
                href={`/place/${place.dcid}`}
                text={place.name}
              />
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
  const overviewString = "Overview";
  // Core place data
  const [place, setPlace] = useState<NamedTypedPlace>();
  const [placeSummary, setPlaceSummary] = useState<string>();
  const [placeSubheader, setPlaceSubheader] = useState<string>();

  // API response data
  const [relatedPlacesApiResponse, setRelatedPlacesApiResponse] =
    useState<RelatedPlacesApiResponse>();
  const [placeChartsApiResponse, setPlaceChartsApiResponse] =
    useState<PlaceChartsApiResponse>();
  const [placeOverviewTableApiResponse, setPlaceOverviewTableApiResponse] =
    useState<PlaceOverviewTableApiResponse>();

  // Derived place data
  const [childPlaceType, setChildPlaceType] = useState<string>();
  const [childPlaces, setChildPlaces] = useState<NamedTypedPlace[]>([]);
  const [parentPlaces, setParentPlaces] = useState<NamedTypedPlace[]>([]);
  const [pageConfig, setPageConfig] = useState<SubjectPageConfig>();
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Get locale
  const metadataContainer = document.getElementById("metadata-base");
  const locale = metadataContainer.dataset.locale;

  const { setQueryString: setStoreQueryString } = useQueryStore();

  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get("category") || overviewString;
  const isOverview = category === overviewString;
  const forceDevPlaces = urlParams.get("force_dev_places") === "true";
  const hasPlaceCharts =
    place && pageConfig && pageConfig.categories.length > 0;
  const hasNoCharts =
    place && pageConfig && pageConfig.categories.length == 0 && !isLoading;

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
    if (
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
    setStoreQueryString(pageMetadata.dataset.placeName);
  }, []);

  /**
   * Set the visibility on the loading indicator on loading changes.
   */
  useEffect(() => {
    const loadingElem = document.getElementById("page-loading");
    loadingElem.style.display = isLoading ? "" : "none";
  }, [isLoading, setIsLoading]);

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
      const [
        placeChartsApiResponse,
        relatedPlacesApiResponse,
        placeOverviewTableApiResponse,
      ] = await Promise.all([
        defaultDataCommonsWebClient.getPlaceCharts({
          category,
          locale,
          placeDcid: place.dcid,
        }),
        defaultDataCommonsWebClient.getRelatedPLaces({
          locale,
          placeDcid: place.dcid,
        }),
        defaultDataCommonsWebClient.getPlaceOverviewTable({
          locale,
          placeDcid: place.dcid,
        }),
      ]);

      setPlaceChartsApiResponse(placeChartsApiResponse);
      setRelatedPlacesApiResponse(relatedPlacesApiResponse);
      setChildPlaceType(relatedPlacesApiResponse.childPlaceType);
      setChildPlaces(relatedPlacesApiResponse.childPlaces);
      setParentPlaces(relatedPlacesApiResponse.parentPlaces);
      setPlaceOverviewTableApiResponse(placeOverviewTableApiResponse);
      setIsLoading(false);
      const config = placeChartsApiResponsesToPageConfig(
        placeChartsApiResponse,
        relatedPlacesApiResponse.parentPlaces,
        relatedPlacesApiResponse.peersWithinParent,
        relatedPlacesApiResponse.place,
        isOverview,
        forceDevPlaces
      );
      setPageConfig(config);
    })();
  }, [place, category]);

  useEffect(() => {
    if (placeChartsApiResponse && placeChartsApiResponse.blocks) {
      setCategories(placeChartsApiResponse.categories);
    }
  }, [placeChartsApiResponse, setPlaceChartsApiResponse]);

  if (!place) {
    return <div>Loading...</div>;
  }
  if (hasError) {
    return <div>Place &quot;{place.dcid}&quot; not found.</div>;
  }
  return (
    <ThemeProvider theme={theme}>
      <RawIntlProvider value={intl}>
        <PlaceHeader
          category={category}
          place={place}
          placeSubheader={placeSubheader}
        />
        <PlaceCategoryTabs
          categories={categories}
          selectedCategory={category}
          place={place}
          forceDevPlaces={forceDevPlaces}
        />
        {isOverview &&
          placeOverviewTableApiResponse &&
          placeOverviewTableApiResponse.data.length > 0 && (
            <PlaceOverview
              place={place}
              placeSummary={placeSummary}
              parentPlaces={parentPlaces}
              placeOverviewTableApiResponse={placeOverviewTableApiResponse}
            />
          )}
        {hasPlaceCharts && (
          <PlaceCharts
            place={place}
            childPlaceType={childPlaceType}
            pageConfig={pageConfig}
          />
        )}
        {hasNoCharts && (
          <div>
            No {category === overviewString ? "" : category} data found for{" "}
            {place.name}.
          </div>
        )}
        {isOverview && childPlaces.length > 0 && (
          <RelatedPlaces place={place} childPlaces={childPlaces} />
        )}
        {isFeatureEnabled(SCROLL_TO_TOP_FEATURE_FLAG) && <ScrollToTopButton />}
      </RawIntlProvider>
    </ThemeProvider>
  );
};
