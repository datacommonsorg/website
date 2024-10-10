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
 * Component for the user message section
 */

import _ from "lodash";
import React from "react";

import { UserMessageInfo } from "../../types/app/explore_types";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getTopics } from "../../utils/app/explore_utils";
import { ItemList } from "./item_list";

const DATA_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSf_kZ13bmzXvgEbim0OXeAVsTQYsIhN8_o9ekdbjKoeFjfvRA/viewform";
const LOW_CONFIDENCE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfZw0M1xcwDLZYt0r1o9-KVsLZZINxNbTcgeBLrcPHTadsrgA/viewform";

interface UserMessagePropType {
  userMessage: UserMessageInfo;
  shouldShowTopics: boolean;
  // pageMetadata and placeUrlVal only need to be set if shouldShowTopics
  // is true.
  pageMetadata?: SubjectPageMetadata;
  placeUrlVal?: string;
}

export function UserMessage(props: UserMessagePropType): JSX.Element {
  if (!props.userMessage || _.isEmpty(props.userMessage.msgList)) {
    return null;
  }

  const topicList = props.shouldShowTopics
    ? getTopics(props.pageMetadata, props.placeUrlVal)
    : [];

  const showLowConfidence =
    props.userMessage.msgList.findIndex((msg) =>
      msg.includes("Low confidence")
    ) >= 0;
  return (
    <div className="user-message-container">
      <div className="image-icon">
        <img src="/images/explore-global-msg.svg" />
      </div>
      <div className="user-message">
        <div className="user-message-text">
          {props.userMessage.msgList.map((msg, idx) => (
            <span className="main-message" key={`user-msg-${idx}`}>
              {msg}
            </span>
          ))}
          {props.userMessage.showForm && (
            <span className="sub-message">
              <a href={DATA_FORM_URL}>Fill out this form</a> to add data to
              answer this query.
            </span>
          )}
          {!props.userMessage.showForm && showLowConfidence && (
            <span className="sub-message">
              <a href={LOW_CONFIDENCE_FORM_URL}>Flag inappropriate results</a>
            </span>
          )}
        </div>
        {!_.isEmpty(topicList) ? (
          <ItemList items={topicList} />
        ) : (
          <div className="bottom-border" />
        )}
      </div>
    </div>
  );
}
