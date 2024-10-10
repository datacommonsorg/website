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
  CLIENT_TYPES,
  DEFAULT_TOPIC,
  URL_HASH_PARAMS,
} from "../../constants/app/explore_constants";
import { DATE_HIGHEST_COVERAGE, DATE_LATEST } from "../../shared/constants";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { defaultDataCommonsWebClient } from "../data_commons_client";
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
  const topics = []
    .concat(pageMetadata?.childTopics || [])
    .concat(pageMetadata?.peerTopics || [])
    .concat(pageMetadata?.parentTopics || []);
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
          [URL_HASH_PARAMS.CLIENT]: CLIENT_TYPES.RELATED_TOPIC,
        })}`,
      });
    }
  }
  return topicList;
}

/**
 * Returns true if highest point coverage for a given parent entity, child type,
 * and variable is equal to the latest observation dates for the same parent
 * entity, child type, variable combination.
 *
 * Put another way, returns true if calling /api/observations/point/within with
 * DATE_HIGHEST_COVERAGE gives the same result as DATE_LATEST
 *
 * @returns boolean
 */
export async function highestCoverageDatesEqualLatestDates(
  parentEntity: string,
  childType: string,
  variables: string[]
): Promise<boolean> {
  const highestCoverageObservations =
    await defaultDataCommonsWebClient.getObservationsPointWithin({
      parentEntity,
      childType,
      variables,
      date: DATE_HIGHEST_COVERAGE,
    });
  const latestObservations =
    await defaultDataCommonsWebClient.getObservationsPointWithin({
      parentEntity,
      childType,
      variables,
      date: DATE_LATEST,
    });

  // Return false if we find any "latest observation dates" that differ from the
  // "highest coverage date"
  const highestCoverageVariableDcids = Object.keys(
    highestCoverageObservations.data
  );
  for (const variableDcid of highestCoverageVariableDcids) {
    // Get the date of highest coverage for this variable. all entites are
    // guaranteed to have the same date, so just check the first entity for its
    // date
    const entityDcid = Object.keys(
      highestCoverageObservations.data[variableDcid]
    ).pop();
    if (!entityDcid) {
      continue;
    }
    const highestCoverageDate =
      highestCoverageObservations.data[variableDcid][entityDcid].date;

    // Ensure that all "latest observation" dates match the highest coverage
    // date.
    const latestObservationEntityDcids = Object.keys(
      latestObservations.data[variableDcid] || {}
    );
    const highestCoverageDateDiffersFromLatestObservationDate =
      !!latestObservationEntityDcids.find(
        (entityDcid) =>
          latestObservations.data[variableDcid][entityDcid].date !==
          highestCoverageDate
      );
    if (highestCoverageDateDiffersFromLatestObservationDate) {
      return false;
    }
  }
  return true;
}
