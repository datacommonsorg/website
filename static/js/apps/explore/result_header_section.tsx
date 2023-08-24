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
      if (topic.dcid == DEFAULT_TOPIC) {
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

  return (
    <>
      <div id="place-callout">
        {placeNameStr}
        {!_.isEmpty(props.pageMetadata.mainTopic) &&
          props.pageMetadata.mainTopic.dcid != DEFAULT_TOPIC && (
            <span> • {props.pageMetadata.mainTopic.name}</span>
          )}
      </div>
      {!_.isEmpty(props.pageMetadata.mainTopic) && (
        <div className="explore-topics-box">
          <span className="explore-relevant-topics">Relevant topics</span>
          <ItemList items={topicList}></ItemList>
        </div>
      )}
      {props.userMessage && <div id="user-message">{props.userMessage}</div>}
    </>
  );
}
