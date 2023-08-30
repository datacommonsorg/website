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

import { UserMessageInfo } from "../../types/app/nl_interface_types";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getTopics } from "../../utils/app/explore_utils";
import { ItemList } from "./item_list";

const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSf_kZ13bmzXvgEbim0OXeAVsTQYsIhN8_o9ekdbjKoeFjfvRA/viewform";

interface UserMessagePropType {
  userMessage: UserMessageInfo;
  shouldShowTopics: boolean;
  // pageMetadata and placeUrlVal only need to be set if shouldShowTopics
  // is true.
  pageMetadata?: SubjectPageMetadata;
  placeUrlVal?: string;
}

export function UserMessage(props: UserMessagePropType): JSX.Element {
  if (!props.userMessage || !props.userMessage.msg) {
    return null;
  }

  const topicList = props.shouldShowTopics
    ? getTopics(props.pageMetadata, props.placeUrlVal)
    : [];

  return (
    <div className="user-message">
      <div className="user-message-text">
        <span className="main-message">{props.userMessage.msg}</span>
        {props.userMessage.showForm && (
          <span className="sub-message">
            <a href={FORM_URL}>Fill out this form</a> to add data to answer this
            query.
          </span>
        )}
      </div>
      {!_.isEmpty(topicList) && <ItemList items={topicList} />}
    </div>
  );
}
