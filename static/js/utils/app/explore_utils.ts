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

import _ from "lodash";

import { Item } from "../../apps/explore/item_list";
import {
  DEFAULT_TOPIC,
  URL_HASH_PARAMS,
} from "../../constants/app/explore_constants";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getUpdatedHash } from "../url_utils";

/**
 * Util functions used by explore.
 */

/**
 * Gets topic list items
 * @param pageMetadata pageMetadata to get the list items from
 * @param placeUrlVal the url value to use for the place in the item urls
 */
export function getTopics(
  pageMetadata: SubjectPageMetadata,
  placeUrlVal: string
): Item[] {
  const topicList = [];
  const topics = pageMetadata?.childTopics
    .concat(pageMetadata?.peerTopics)
    .concat(pageMetadata?.parentTopics);
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
          [URL_HASH_PARAMS.PLACE]: placeUrlVal,
          [URL_HASH_PARAMS.QUERY]: "",
        })}`,
      });
    }
  }
  return topicList;
}
