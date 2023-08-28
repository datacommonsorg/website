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

import _ from "lodash";
import React from "react";

import {
  DEFAULT_TOPIC,
  URL_HASH_PARAMS,
} from "../../constants/app/explore_constants";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getUpdatedHash } from "../../utils/url_utils";
import { ItemList } from "./item_list";

interface ResultHeaderSectionPropType {
  placeUrlVal: string;
  pageMetadata: SubjectPageMetadata;
  userMessage: string;
}

export function ResultHeaderSection(
  props: ResultHeaderSectionPropType
): JSX.Element {
  const topics = props.pageMetadata?.childTopics
    .concat(props.pageMetadata?.peerTopics)
    .concat(props.pageMetadata?.parentTopics);
  const topicList = [];
  if (!_.isEmpty(topics)) {
    for (const topic of topics) {
      if (topic.dcid == DEFAULT_TOPIC || !topic.name) {
        // Do not show the root topic.
        continue;
      }
      topicList.push({
        text: topic.name,
        url: `/explore/#${getUpdatedHash({
          [URL_HASH_PARAMS.TOPIC]: topic.dcid,
          [URL_HASH_PARAMS.PLACE]: props.placeUrlVal,
          [URL_HASH_PARAMS.QUERY]: "",
        })}`,
      });
    }
  }

  let placeNameStr = "";
  for (let i = 0; i < props.pageMetadata.places.length; i++) {
    if (i == 2) {
      placeNameStr += " and more";
      break;
    }
    if (placeNameStr) {
      placeNameStr += ", ";
    }
    placeNameStr += props.pageMetadata.places[i].name;
  }

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
      {props.userMessage && <div id="user-message">{props.userMessage}</div>}
      <div id="place-callout">
        {placeNameStr}
        {topicNameStr && <span> • {topicNameStr}</span>}
      </div>
      {!_.isEmpty(props.pageMetadata.mainTopics) && (
        <div className="explore-topics-box">
          <span className="explore-relevant-topics">Relevant topics</span>
          <ItemList items={topicList}></ItemList>
        </div>
      )}
    </>
  );
}
