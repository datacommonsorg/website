/**
 * Copyright 2025 Google LLC
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
 * The primary component displays the header for the results of an
 * explore page search. This primary component is made up of smaller
 * child components provided in this file.
 */

/** @jsxImportSource @emotion/react */

import { RelatedPlacesApiResponse } from "@datacommonsorg/client/src/data_commons_web_client_types";
import { css } from "@emotion/react";
import _ from "lodash";
import React, { ReactNode, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage } from "react-intl";

import { KeyboardArrowDown } from "../../components/elements/icons/keyboard_arrow_down";
import { Loading } from "../../components/elements/loading";
import { Tooltip } from "../../components/elements/tooltip/tooltip";
import { intl, LocalizedLink } from "../../i18n/i18n";
import { messages } from "../../i18n/i18n_messages";
import { pageMessages } from "../../i18n/i18n_place_messages";
import { displayNameForPlaceType } from "../../place/util";
import { WEBSITE_SURFACE_HEADER_VALUE } from "../../shared/constants";
import {
  GA_EVENT_RELATED_TOPICS_CLICK,
  GA_EVENT_RELATED_TOPICS_VIEW,
  GA_PARAM_RELATED_TOPICS_MODE,
  GA_VALUE_RELATED_TOPICS_HEADER_TOPICS,
  triggerGAEvent,
} from "../../shared/ga_events";
import { NamedTypedPlace } from "../../shared/types";
import theme from "../../theme/theme";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getTopics } from "../../utils/app/explore_utils";
import { getDataCommonsClient } from "../../utils/data_commons_client";
import { ItemList } from "./item_list";

interface PlacesTooltipContentProps {
  //a list of the places to be rendered in the tooltip
  places: NamedTypedPlace[];
  //a mapping of each place to its related places
  placeToParentPlaces: Record<string, NamedTypedPlace[]>;
}

/**
 * Renders the list of places and their parent places inside a tooltip.
 * This is used whenever we have multiple places.
 */
const AdditionalPlaceTooltipContent = ({
  places,
  placeToParentPlaces,
}: PlacesTooltipContentProps): React.JSX.Element => (
  <ul
    css={css`
      display: flex;
      flex-direction: column;
      gap: ${theme.spacing.sm}px;
      width: 100%;
      padding: 0;
      margin: 0;
      && li {
        display: block;
        border-bottom: 1px solid ${theme.colors.tabs.lining};
        padding-bottom: ${theme.spacing.sm}px;
        &:last-of-type {
          padding-bottom: 0;
          border-bottom: 0;
        }
      }
    `}
  >
    {places.map((place) => {
      const parentPlaces = placeToParentPlaces[place.dcid] || [];
      const placeLinks = [
        <LocalizedLink
          key={place.dcid}
          className="place-callout-link"
          href={`/place/${place.dcid}`}
          text={place.name}
        />,
        ...parentPlaces.map((parent) => (
          <LocalizedLink
            key={parent.dcid}
            href={`/place/${parent.dcid}`}
            text={parent.name}
          />
        )),
      ];
      return (
        <li key={place.dcid}>
          <div
            css={css`
              display: flex;
              flex-wrap: wrap;
            `}
          >
            {placeLinks.map((link, index) => (
              <span key={link.key}>
                {link}
                {index < placeLinks.length - 1 && ", "}
              </span>
            ))}
          </div>
          <div
            css={css`
              display: flex;
              gap: ${theme.spacing.xs}px;
              flex-wrap: wrap;
            `}
          >
            <span
              css={css`
                color: ${theme.colors.text.tertiary.dark};
              `}
            >
              {intl.formatMessage(pageMessages.KnowledgeGraph)} • {""}
            </span>
            <LocalizedLink href={`/browser/${place.dcid}`} text={place.dcid} />
          </div>
        </li>
      );
    })}
  </ul>
);

interface SinglePlaceDetailProps {
  //the place whose details will be rendered in the header
  place: NamedTypedPlace;
  //the related places of this parent.
  parentPlaces: NamedTypedPlace[];
}

/**
 * Renders details for a single place, including its type and parent places.
 * This is used when we have a single place.
 */
const SinglePlaceDetail = ({
  place,
  parentPlaces,
}: SinglePlaceDetailProps): React.JSX.Element => {
  const placeLink = (
    <LocalizedLink
      className="place-callout-link"
      href={`/place/${place.dcid}`}
      text={place.name}
    />
  );

  const uppercasePlaceType =
    place.types && place.types.length > 0
      ? displayNameForPlaceType(place.types[0])
      : "";

  const lowercasePlaceType =
    place.types && place.types.length > 0
      ? displayNameForPlaceType(place.types[0], false, true)
      : "";

  const parentPlacesLinks = parentPlaces.map((parent, index) => (
    <React.Fragment key={parent.dcid}>
      <LocalizedLink href={`/place/${parent.dcid}`} text={parent.name} />
      {index < parentPlaces.length - 1 && ", "}
    </React.Fragment>
  ));

  return (
    <p
      css={css`
        margin: 0;
        color: ${theme.colors.text.secondary.base};
      `}
    >
      {parentPlaces.length > 0 ? (
        <FormattedMessage
          {...messages.aboutPlaceInPlace}
          values={{
            place: placeLink,
            lowercasePlaceType,
            uppercasePlaceType,
            parentPlaces: parentPlacesLinks,
          }}
        />
      ) : (
        <FormattedMessage
          {...messages.aboutPlace}
          values={{ place: placeLink }}
        />
      )}
      <span>
        {""} • {""}
      </span>
      {intl.formatMessage(pageMessages.KnowledgeGraph)} {""}
      <LocalizedLink href={`/browser/${place.dcid}`} text={place.dcid} />
    </p>
  );
};

interface MultiplePlacesDetailProps {
  //a list of the places to be rendered in the tooltip
  places: NamedTypedPlace[];
  //a mapping of each place to its related places
  placeToParentPlaces: Record<string, NamedTypedPlace[]>;
}

/**
 * Renders copy to indicate the number of places with a tooltip to view the full list.
 */
const MultiplePlacesDetail = ({
  places,
  placeToParentPlaces,
}: MultiplePlacesDetailProps): React.JSX.Element => {
  const TooltipTrigger = (chunks: ReactNode): React.JSX.Element => (
    <Tooltip
      title={
        <AdditionalPlaceTooltipContent
          places={places}
          placeToParentPlaces={placeToParentPlaces}
        />
      }
      placement="bottom-end"
      distance={10}
      maxWidth={420}
    >
      <span
        css={css`
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: ${theme.spacing.xs}px;
          color: ${theme.colors.link.primary.base};
        `}
      >
        {chunks}
        <KeyboardArrowDown />
      </span>
    </Tooltip>
  );
  TooltipTrigger.displayName = "TooltipTrigger";

  return (
    <p
      css={css`
        margin: 0;
        color: ${theme.colors.text.secondary.base};
      `}
    >
      <FormattedMessage
        {...pageMessages.learnMoreAboutThesePlaces}
        values={{
          numPlaces: places.length,
          link: TooltipTrigger,
        }}
      />
    </p>
  );
};

interface PlaceHeaderProps {
  //true if the related places are loading
  isLoading: boolean;
  //a list of the places to be rendered in the header
  places: NamedTypedPlace[];
  //a mapping of each place to its related places
  placeToParentPlaces: Record<string, NamedTypedPlace[]>;
}

/**
 * Renders the header for place information. While the place details are loading, this component shows
 * a loading state. Once loaded, it will show either the single or multiple place detail components.
 */
const PlaceHeader = ({
  isLoading,
  places,
  placeToParentPlaces,
}: PlaceHeaderProps): React.JSX.Element => {
  const numPlaces = places.length;

  return (
    <div
      id="result-header-place-callout"
      css={css`
        display: flex;
        justify-content: flex-end;
        width: 100%;
        height: auto;
        min-height: 20px;
        ${theme.typography.family.text};
        ${theme.typography.text.sm};
        transition: height 0.3s ease-in-out;
        padding-bottom: ${theme.spacing.xs}px;
        @media (max-width: ${theme.breakpoints.lg}px) {
          padding-bottom: ${theme.spacing.sm}px;
          justify-content: flex-start;
          flex-wrap: wrap;
        }
      `}
    >
      {isLoading && <Loading />}
      {!isLoading &&
        numPlaces > 0 &&
        (numPlaces === 1 ? (
          <SinglePlaceDetail
            place={places[0]}
            parentPlaces={placeToParentPlaces[places[0].dcid] || []}
          />
        ) : (
          <MultiplePlacesDetail
            places={places}
            placeToParentPlaces={placeToParentPlaces}
          />
        ))}
    </div>
  );
};

interface ResultHeaderSectionProps {
  // the DCID of the first place in the search results
  placeUrlVal: string;
  // Metadata for the subject page, containing places and topics.
  pageMetadata: SubjectPageMetadata;
  // Whether to hide the related topics section.
  hideRelatedTopics: boolean;
  // The user's search query string.
  query: string;
}

/**
 * Truncates the list of parent places based on the type of the primary place.
 * - if it is a country, we truncate at the continent:
 *      e.g. United States of America, North America
 *  - if it is anything else, we truncate at the Country:
 *      e.g. Texas, United States of America.
 *  - if we are at a higher level than country, nothing is truncated.
 * @param place The primary place.
 * @param parentPlaces The list of parent places to truncate.
 * @returns A truncated list of parent places.
 */
const truncateParentPlaces = (
  place: NamedTypedPlace,
  parentPlaces: NamedTypedPlace[]
): NamedTypedPlace[] => {
  const isCountry = place.types?.includes("Country");
  let truncateIndex: number;

  if (isCountry) {
    truncateIndex = parentPlaces.findIndex((p) =>
      p.types?.includes("Continent")
    );
  } else {
    truncateIndex = parentPlaces.findIndex((p) => p.types?.includes("Country"));
  }

  if (truncateIndex !== -1) {
    return parentPlaces.slice(0, truncateIndex + 1);
  }
  return parentPlaces;
};

/**
 * Renders the main header section for a successful search results page.
 */
export function ResultHeaderSection(
  props: ResultHeaderSectionProps
): React.JSX.Element {
  const [places, setPlaces] = useState<NamedTypedPlace[]>([]);
  const [placeToParentPlaces, setPlaceToParentPlaces] = useState<
    Record<string, NamedTypedPlace[]>
  >({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { ref: inViewRef } = useInView({
    triggerOnce: true,
    rootMargin: "0px",
    onChange: (inView) => {
      if (inView) {
        onComponentInitialView();
      }
    },
  });
  const topicList = props.hideRelatedTopics
    ? []
    : getTopics(props.pageMetadata, props.placeUrlVal);

  const dataCommonsClient = getDataCommonsClient(
    null,
    WEBSITE_SURFACE_HEADER_VALUE
  );

  useEffect(() => {
    const initialPlaces = props.pageMetadata.places;
    if (!initialPlaces || initialPlaces.length === 0) {
      setIsLoading(false);
      return;
    }

    (async (): Promise<void> => {
      try {
        const promises = initialPlaces.map((place) =>
          dataCommonsClient.webClient.getRelatedPLaces({
            placeDcid: place.dcid,
          })
        );
        const responses: RelatedPlacesApiResponse[] = await Promise.all(
          promises
        );

        const parentPlacesMap: Record<string, NamedTypedPlace[]> = {};
        const newPlaces: NamedTypedPlace[] = [];

        responses.forEach((response) => {
          newPlaces.push(response.place);

          parentPlacesMap[response.place.dcid] = truncateParentPlaces(
            response.place,
            response.parentPlaces
          );
        });

        setPlaceToParentPlaces(parentPlacesMap);
        setPlaces(newPlaces);
      } catch (error) {
        console.error("Error fetching parent places:", error);
        setPlaces([]);
        setPlaceToParentPlaces({});
      } finally {
        setIsLoading(false);
      }
    })();
  }, [props.pageMetadata.places]);

  return (
    <>
      <PlaceHeader
        isLoading={isLoading}
        places={places}
        placeToParentPlaces={placeToParentPlaces}
      />
      <p
        css={css`
          ${theme.typography.family.text}
          ${theme.typography.text.sm}
          color: ${theme.colors.text.tertiary.base};
          padding-top: ${theme.spacing.sm}px;
          margin-bottom: ${theme.spacing.xs}px;
        `}
      >
        {intl.formatMessage(messages.searchQuestionIntroduction)}
      </p>
      <h3
        css={css`
          ${theme.typography.family.heading}
          ${theme.typography.heading.lg}
          margin-bottom: ${theme.spacing.md + 2}px;
        `}
      >
        {props.query}
      </h3>
      {!_.isEmpty(props.pageMetadata.mainTopics) && !_.isEmpty(topicList) && (
        <div
          className="explore-topics-box"
          ref={inViewRef}
          css={css`
            margin-bottom: ${theme.spacing.md + 4}px;
          `}
        >
          <ItemList
            items={topicList}
            showRelevantTopicLabel={true}
            onItemClicked={(): void => {
              triggerGAEvent(GA_EVENT_RELATED_TOPICS_CLICK, {
                [GA_PARAM_RELATED_TOPICS_MODE]:
                  GA_VALUE_RELATED_TOPICS_HEADER_TOPICS,
              });
            }}
          ></ItemList>
        </div>
      )}
    </>
  );
}

const onComponentInitialView = (): void => {
  triggerGAEvent(GA_EVENT_RELATED_TOPICS_VIEW, {
    [GA_PARAM_RELATED_TOPICS_MODE]: GA_VALUE_RELATED_TOPICS_HEADER_TOPICS,
  });
};
