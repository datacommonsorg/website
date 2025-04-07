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
} from "@datacommonsorg/client/dist/data_commons_web_client_types";
import { ThemeProvider } from "@emotion/react";
import styled from "@emotion/styled";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import { RawIntlProvider } from "react-intl";

import { Loading } from "../components/elements/loading";
import { ScrollToTopButton } from "../components/elements/scroll_to_top_button";
import { SubjectPageMainPane } from "../components/subject_page/main_pane";
import { intl, LocalizedLink } from "../i18n/i18n";
import { pageMessages } from "../i18n/i18n_place_messages";
import { useQueryStore } from "../shared/stores/query_store_hook";
import { NamedTypedPlace } from "../shared/types";
import theme from "../theme/theme";
import { SubjectPageConfig } from "../types/subject_page_proto_types";
import { defaultDataCommonsWebClient } from "../utils/data_commons_client";
import { PlaceOverview } from "./dev_place_overview";
import {
  createPlacePageCategoryHref,
  displayNameForPlaceType,
  placeChartsApiResponsesToPageConfig,
} from "./util";

const PlaceWarning = styled.div`
  padding: 24px;
  font-size: ${(p) => p.theme.typography.text.md};
`;

/**
 * Component that renders the header section of a place page.
 * Displays the place name, category (if not Overview), and subheader text.
 * Also shows the place DCID with a link to view it in the Knowledge Graph browser.
 *
 * @param props.category The current category being viewed
 * @param props.place The place object containing name and DCID
 * @param props.parentPlaces Array of parent places
 * @returns Header component for the place page
 */
const PlaceHeader = (props: {
  selectedCategory: Category;
  place: NamedTypedPlace;
  parentPlaces: NamedTypedPlace[];
  isLoading: boolean;
}): React.JSX.Element => {
  const { selectedCategory, place, parentPlaces, isLoading } = props;
  const parentPlacesLinks = parentPlaces.map((parent, index) => {
    return (
      <span key={parent.dcid}>
        <LocalizedLink
          className="place-info-link"
          href={`/place/${parent.dcid}`}
          text={parent.name}
        />
        {index < parentPlaces.length - 1 ? ", " : ""}
      </span>
    );
  });

  const placeHref = createPlacePageCategoryHref("Overview", place);

  return (
    <div className="title-section">
      <div className="place-info">
        <h1>
          <span data-testid="place-name">
            {selectedCategory.name === "Overview" ? (
              place.name
            ) : (
              <a className="place-info-link" href={placeHref}>
                {place.name}
              </a>
            )}
            {selectedCategory.name != "Overview"
              ? ` • ${selectedCategory.translatedName}`
              : ""}{" "}
          </span>
          <div className="dcid-and-knowledge-graph">
            {intl.formatMessage(pageMessages.KnowledgeGraph)} •{" "}
            <LocalizedLink href={`/browser/${place.dcid}`} text={place.dcid} />
          </div>
        </h1>
        {isLoading && (
          <div>
            <Loading />
          </div>
        )}
        {place.types?.length > 0 && parentPlacesLinks.length > 0 && (
          <p className="subheader">
            {intl.formatMessage(pageMessages.placeTypeInPlaces, {
              placeType: displayNameForPlaceType(place.types[0]),
              parentPlaces: parentPlacesLinks,
            })}
          </p>
        )}
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
 * @param props.place The place object containing the DCID for generating URLs
 * @returns Button component for the current topic
 */
const CategoryItem = (props: {
  category: Category;
  selectedCategoryName: string;
  place: NamedTypedPlace;
}): React.JSX.Element => {
  const { category, selectedCategoryName, place } = props;

  return (
    <div className="item-list-item">
      <LocalizedLink
        href={createPlacePageCategoryHref(category.name, place)}
        className={`item-list-text ${
          selectedCategoryName === category.name ? " selected" : ""
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
  selectedCategory,
  place,
}: {
  categories: Category[];
  selectedCategory: Category;
  place: NamedTypedPlace;
}): React.JSX.Element => {
  if (!categories || categories.length == 0) {
    return <></>;
  }

  return (
    <div className="explore-topics-box">
      <div className="item-list-container">
        <div className="item-list-inner">
          <span className="explore-relevant-topics">
            {intl.formatMessage(pageMessages.RelevantTopics)}
          </span>
          {categories.map((category) => (
            <CategoryItem
              key={category.name}
              category={category}
              selectedCategoryName={selectedCategory.name}
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

  // API response data
  const [receivedApiResponse, setReceivedApiResponse] = useState(false);
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>({
    name: "Overview",
    translatedName: "",
    hasMoreCharts: false,
  });

  // Get locale
  const metadataContainer = document.getElementById("metadata-base");
  const locale = metadataContainer.dataset.locale;

  const { setPlaceholderString: setStorePlaceholderString } = useQueryStore();

  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get("category") || overviewString;
  const isOverview = category === overviewString;
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
    if (_.isEmpty(pageMetadata.dataset.placeDcid)) {
      console.error("Error loading place page metadata element");
      setHasError(true);
    }
    // Get place name from page metadata. Use placeDcid if placeName is not set.
    const placeName =
      pageMetadata.dataset.placeName || pageMetadata.dataset.placeDcid;
    setPlace({
      name: placeName,
      dcid: pageMetadata.dataset.placeDcid,
      types: [],
    });
    setPlaceSummary(pageMetadata.dataset.placeSummary);
  }, []);

  /**
   * Once we have place data, fetch chart and related places data from the API.
   * Updates state with API responses and derived data.
   */
  useEffect(() => {
    if (!place || receivedApiResponse) {
      return;
    }
    const pageMetadata = document.getElementById("page-metadata");
    if (!pageMetadata) {
      console.error("Error loading place page metadata element");
      setHasError(true);
      return;
    }
    (async (): Promise<void> => {
      try {
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
        setReceivedApiResponse(true);
        setPlaceChartsApiResponse(placeChartsApiResponse);
        setPlaceOverviewTableApiResponse(placeOverviewTableApiResponse);

        setChildPlaceType(relatedPlacesApiResponse.childPlaceType);
        setChildPlaces(relatedPlacesApiResponse.childPlaces);
        setParentPlaces(relatedPlacesApiResponse.parentPlaces);
        setIsLoading(false);
        setPlace(relatedPlacesApiResponse.place);
        setCategories(placeChartsApiResponse.categories);
        const newSelectedCategory = placeChartsApiResponse.categories.find(
          (c) => c.name === category
        );
        // If selected category is not found, keep it set to the default "Overview" value
        if (newSelectedCategory) {
          setSelectedCategory(newSelectedCategory);
        }

        // Set the navbar search query placeholder string.
        if (isOverview) {
          setStorePlaceholderString(pageMetadata.dataset.placeName);
        } else {
          setStorePlaceholderString(
            intl.formatMessage(pageMessages.categoryInPlace, {
              placeName: pageMetadata.dataset.placeName,
              category: selectedCategory.translatedName,
            })
          );
        }

        const config = placeChartsApiResponsesToPageConfig(
          placeChartsApiResponse,
          relatedPlacesApiResponse.parentPlaces,
          relatedPlacesApiResponse.peersWithinParent,
          relatedPlacesApiResponse.place,
          isOverview,
          theme
        );
        setPageConfig(config);
      } catch (error) {
        console.error("Error fetching place data:", error);
        setHasError(true);
        return;
      }
    })();
  }, [place, category, selectedCategory]);

  if (hasError) {
    return (
      <div>
        {intl.formatMessage(pageMessages.placeNotFound, {
          placeDcid: place.dcid,
        })}
      </div>
    );
  }

  if (!place) {
    return (
      <div>
        <Loading />
      </div>
    );
  }
  return (
    <ThemeProvider theme={theme}>
      <RawIntlProvider value={intl}>
        <PlaceHeader
          selectedCategory={selectedCategory}
          place={place}
          parentPlaces={parentPlaces}
          isLoading={isLoading}
        />
        <PlaceCategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          place={place}
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
          <PlaceWarning>
            {intl.formatMessage(pageMessages.noCharts, {
              category: selectedCategory.translatedName,
              place: place.name,
            })}
          </PlaceWarning>
        )}
        {isOverview && childPlaces.length > 0 && (
          <RelatedPlaces place={place} childPlaces={childPlaces} />
        )}
        <ScrollToTopButton />
      </RawIntlProvider>
    </ThemeProvider>
  );
};
