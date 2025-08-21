/**
 * Copyright 2023 Google LLC
 *
 * Licensed under he Apache License, Version 2.0 (the "License");
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
import styled from "@emotion/styled";
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
import { defaultDataCommonsWebClient } from "../../utils/data_commons_client";
import { Place } from "../data_overview/place_data";
import { ItemList } from "./item_list";

interface PlacesTooltipContentProps {
  items: Place[];
  allParentPlaces: Record<string, NamedTypedPlace[]>;
}

const AdditionalPlaceTooltipContent = ({
  items,
  allParentPlaces,
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
    {items.map((place) => {
      const parentPlaces = allParentPlaces[place.dcid] || [];
      return (
        <li key={place.dcid}>
          <div
            css={css`
              display: flex;
              flex-wrap: wrap;
            `}
          >
            <LocalizedLink
              className="place-callout-link"
              href={`/place/${place.dcid}`}
              text={place.name}
            />
            {parentPlaces.map((parent) => (
              <span key={parent.dcid}>
                {", "}
                <LocalizedLink
                  className="place-callout-link"
                  href={`/place/${parent.dcid}`}
                  text={parent.name}
                />
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
            <LocalizedLink
              className="dcid-callout-link"
              href={`/browser/${place.dcid}`}
              text={place.dcid}
            />
          </div>
        </li>
      );
    })}
  </ul>
);

interface SinglePlaceDetailProps {
  place: NamedTypedPlace;
  parentPlaces: NamedTypedPlace[];
}

const SinglePlaceDetail = ({
  place,
  parentPlaces,
}: SinglePlaceDetailProps): React.JSX.Element => {
  return (
    <p
      css={css`
        color: ${theme.colors.text.secondary.base};
      `}
    >
      {intl.formatMessage(messages.allAbout)} {""}
      <span>
        <LocalizedLink
          className="place-callout-link"
          href={`/place/${place.dcid}`}
          text={place.name}
        />
        {parentPlaces.map((parent) => (
          <span key={parent.dcid}>
            {", "}
            <LocalizedLink
              className="place-callout-link"
              href={`/place/${parent.dcid}`}
              text={parent.name}
            />
          </span>
        ))}
      </span>
      <span>
        {""} • {""}
      </span>
      {intl.formatMessage(pageMessages.KnowledgeGraph)} {""}
      <LocalizedLink
        className="place-callout-link"
        href={`/browser/${place.dcid}`}
        text={place.dcid}
      />
    </p>
  );
};

interface MultiplePlacesDetailProps {
  places: NamedTypedPlace[];
  placeToParentPlaces: Record<string, NamedTypedPlace[]>;
}

const MultiplePlacesDetail = ({
  places,
  placeToParentPlaces,
}: MultiplePlacesDetailProps): React.JSX.Element => {
  const TooltipTrigger = (chunks: ReactNode): React.JSX.Element => (
    <Tooltip
      title={
        <AdditionalPlaceTooltipContent
          items={places}
          allParentPlaces={placeToParentPlaces}
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
  isLoading: boolean;
  places: NamedTypedPlace[];
  placeToParentPlaces: Record<string, NamedTypedPlace[]>;
}

const PlaceHeader = ({
  isLoading,
  places,
  placeToParentPlaces,
}: PlaceHeaderProps): React.JSX.Element => {
  const numPlaces = places.length;

  return (
    <div
      css={css`
        display: flex;
        justify-content: flex-end;
        width: 100%;
        min-height: 20px;
        ${theme.typography.family.text};
        ${theme.typography.text.sm};
        @media (max-width: ${theme.breakpoints.lg}px) {
          justify-content: flex-start;
          margin-bottom: ${theme.spacing.md}px;
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

interface ResultHeaderSectionPropType {
  placeUrlVal: string;
  pageMetadata: SubjectPageMetadata;
  hideRelatedTopics: boolean;
  query: string;
}

export function ResultHeaderSection(
  props: ResultHeaderSectionPropType
): React.JSX.Element {
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

  useEffect(() => {
    const places = props.pageMetadata.places;
    if (!places || places.length === 0) {
      setIsLoading(false);
      return;
    }

    (async (): Promise<void> => {
      try {
        const promises = places.map((place) =>
          defaultDataCommonsWebClient.getRelatedPLaces({
            placeDcid: place.dcid,
          })
        );
        const responses: RelatedPlacesApiResponse[] = await Promise.all(
          promises
        );

        const parentPlacesMap: Record<string, NamedTypedPlace[]> = {};
        responses.forEach((response, index) => {
          const placeDcid = places[index].dcid;
          let parents = response.parentPlaces;
          if (
            parents.length > 0 &&
            parents[parents.length - 1].dcid === "Earth"
          ) {
            parents = parents.slice(0, -1);
          }
          parentPlacesMap[placeDcid] = parents;
        });
        setPlaceToParentPlaces(parentPlacesMap);
      } catch (error) {
        console.error("Error fetching parent places:", error);
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
        places={props.pageMetadata.places}
        placeToParentPlaces={placeToParentPlaces}
      />
      <p
        css={css`
          ${theme.typography.family.text}
          ${theme.typography.text.sm}
          color: ${theme.colors.text.secondary.base};
        `}
      >
        {intl.formatMessage(messages.searchQuestionIntroduction)}
      </p>
      <h3
        css={css`
          ${theme.typography.family.heading}
          ${theme.typography.heading.lg}
          margin-bottom: ${theme.spacing.md}px;
        `}
      >
        {props.query}
      </h3>
      {!_.isEmpty(props.pageMetadata.mainTopics) && !_.isEmpty(topicList) && (
        <div className="explore-topics-box" ref={inViewRef}>
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
