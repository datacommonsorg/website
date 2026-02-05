/**
 * Copyright 2023 Google LLC
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
 * Component for the result header section
 */

/*
  TODO (nick-next): When the `explore_result_header` feature flag is
   to be removed, remove this component.
 */

import _ from "lodash";
import React from "react";
import { useInView } from "react-intersection-observer";

import { DEFAULT_TOPIC } from "../../constants/app/explore_constants";
import {
  GA_EVENT_RELATED_TOPICS_CLICK,
  GA_EVENT_RELATED_TOPICS_VIEW,
  GA_PARAM_RELATED_TOPICS_MODE,
  GA_VALUE_RELATED_TOPICS_HEADER_TOPICS,
  triggerGAEvent,
} from "../../shared/ga_events";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getTopics } from "../../utils/app/explore_utils";
import { ItemList } from "./item_list";

interface ResultHeaderSectionLegacyPropType {
  placeUrlVal: string;
  pageMetadata: SubjectPageMetadata;
  hideRelatedTopics: boolean;
}

export function ResultHeaderSectionLegacy(
  props: ResultHeaderSectionLegacyPropType
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
  }

  return (
    <>
      <div id="place-callout">
        {getPlaceHeader()}
        {topicNameStr && <span> • {topicNameStr}</span>}
      </div>
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

    if (numPlaces === 1) {
      return (
        <a className="place-callout-link" href={`/place/${places[0].dcid}`}>
          {places[0].name}
        </a>
      );
    }
    return (
      <>
        <a className="place-callout-link" href={`/place/${places[0].dcid}`}>
          {places[0].name}
        </a>
        {", "}
        <a className="place-callout-link" href={`/place/${places[1].dcid}`}>
          {places[1].name}
        </a>
        {numPlaces > 2 && <>&nbsp;and more</>}
      </>
    );
  }
}

const onComponentInitialView = (): void => {
  triggerGAEvent(GA_EVENT_RELATED_TOPICS_VIEW, {
    [GA_PARAM_RELATED_TOPICS_MODE]: GA_VALUE_RELATED_TOPICS_HEADER_TOPICS,
  });
};
