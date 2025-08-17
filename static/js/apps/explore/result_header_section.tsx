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
 * Component for the result header section
 */

/** @jsxImportSource @emotion/react */

import { css } from "@emotion/react";
import styled from "@emotion/styled";
import _ from "lodash";
import React, { ReactElement } from "react";
import { useInView } from "react-intersection-observer";

import { KeyboardArrowDown } from "../../components/elements/icons/keyboard_arrow_down";
import { Tooltip } from "../../components/elements/tooltip/tooltip";
import { intl } from "../../i18n/i18n";
import { messages } from "../../i18n/i18n_messages";
import { metadataComponentMessages } from "../../i18n/i18n_metadata_messages";
//import { DEFAULT_TOPIC } from "../../constants/app/explore_constants";
import {
  GA_EVENT_RELATED_TOPICS_CLICK,
  GA_EVENT_RELATED_TOPICS_VIEW,
  GA_PARAM_RELATED_TOPICS_MODE,
  GA_VALUE_RELATED_TOPICS_HEADER_TOPICS,
  triggerGAEvent,
} from "../../shared/ga_events";
import theme from "../../theme/theme";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getTopics } from "../../utils/app/explore_utils";
import { Place } from "../data_overview/place_data";
import { ItemList } from "./item_list";

const PlaceInfo = styled.p`
  ${theme.typography.family.text}
  ${theme.typography.text.sm}
  display: flex;
  gap: ${theme.spacing.xs}px;
  padding: 0;
  margin: 0 0 0 ${theme.spacing.xs}px;
  text-align: left;
  color: ${theme.colors.text.secondary.base};
`;

interface AdditionalPlaceTooltipContentProps {
  items: Place[];
}

const AdditionalPlaceTooltipContent = ({
  items,
}: AdditionalPlaceTooltipContentProps): ReactElement => (
  <>
    {items.map((place) => (
      <p
        key={place.dcid}
        css={css`
          display: flex;
          gap: ${theme.spacing.xs}px;
        `}
      >
        <a className="place-callout-link" href={`/place/${place.dcid}`}>
          {place.name}
        </a>
        <span>•</span>
        <span>{intl.formatMessage(metadataComponentMessages.DCID)}</span>
        <a className="place-callout-link" href={`/place/${place.dcid}`}>
          {place.dcid}
        </a>
      </p>
    ))}
  </>
);

interface ResultHeaderSectionPropType {
  placeUrlVal: string;
  pageMetadata: SubjectPageMetadata;
  hideRelatedTopics: boolean;
  query: string;
}

export function ResultHeaderSection(
  props: ResultHeaderSectionPropType
): JSX.Element {
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
  /*
  let topicNameStr = "";
  if (
    !_.isEmpty(props.pageMetadata.mainTopics) &&
    props.pageMetadata.mainTopics[0].dcid !== DEFAULT_TOPIC
  ) {
    if (props.pageMetadata.mainTopics.length == 2) {
      topicNameStr = `${props.pageMetadata.mainTopics[0].name} vs. ${props.pageMetadata.mainTopics[1].name}`;
    } else {
      topicNameStr = `${props.pageMetadata.mainTopics[0].name}`;
    }
  }*/

  return (
    <>
      {getPlaceHeader()}
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

  function getPlaceHeader(): JSX.Element {
    const places = props.pageMetadata.places;
    const numPlaces = places.length;

    if (numPlaces === 0) {
      return <></>;
    }

    const placesToDisplay = places.slice(0, 1);
    const morePlaces = places.slice(1);

    return (
      <div
        css={css`
          display: flex;
          justify-content: flex-end;
          width: 100%;
        `}
      >
        <PlaceInfo>{intl.formatMessage(messages.allAbout)}</PlaceInfo>
        {placesToDisplay.map((place) => (
          <React.Fragment key={place.dcid}>
            <PlaceInfo>
              <a className="place-callout-link" href={`/place/${place.dcid}`}>
                {place.name}
              </a>
              <span>•</span>
              {intl.formatMessage(metadataComponentMessages.DCID)}
              <a className="place-callout-link" href={`/place/${place.dcid}`}>
                {place.dcid}
              </a>
            </PlaceInfo>
          </React.Fragment>
        ))}
        {numPlaces > 1 && (
          <PlaceInfo>
            <Tooltip
              title={<AdditionalPlaceTooltipContent items={morePlaces} />}
              placement="bottom-end"
            >
              <span
                css={css`
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  gap: ${theme.spacing.xs}px;
                `}
              >
                {intl.formatMessage(messages.andMore, {
                  places: morePlaces.length,
                })}
                <KeyboardArrowDown />
              </span>
            </Tooltip>
          </PlaceInfo>
        )}
      </div>
    );
  }
}

const onComponentInitialView = (): void => {
  triggerGAEvent(GA_EVENT_RELATED_TOPICS_VIEW, {
    [GA_PARAM_RELATED_TOPICS_MODE]: GA_VALUE_RELATED_TOPICS_HEADER_TOPICS,
  });
};
