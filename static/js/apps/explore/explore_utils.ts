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


import { BlockConfig } from "../../types/subject_page_proto_types";
import { SubjectPageMetadata } from "../../types/subject_page_types";
/**
 * Checks if the fulfill data is valid.
 * @param fulfillData - The fulfill data to validate.
 * @returns boolean indicating if the fulfill data is valid.
*/
/* eslint-disable */
export function isFulfillDataValid(fulfillData: any): boolean {
  /* eslint-enable */
  if (!fulfillData) {
    return false;
  }
  const hasPlace = fulfillData["place"] && fulfillData["place"]["dcid"];
  // Fulfill data needs to have either a place or entities
  return hasPlace || fulfillData["entities"];
}

/**
 * Filters out blocks from the page metadata that are present in the highlight
 * page metadata.
 *
 * @param pageMetadata - The original page metadata.
 * @param highlightPageMetadata - The highlight page metadata.
 * @returns The new page metadata with the blocks filtered out.
 */
export function filterBlocksFromPageMetadata(
  pageMetadata: SubjectPageMetadata,
  blocksToRemove: BlockConfig[]
): SubjectPageMetadata {
  // Filter out all blocks that exactly match the blocks in the page metadata
  // and return the new page metadata.
  const newPageMetadata = { ...pageMetadata };
  newPageMetadata.pageConfig = {
    ...pageMetadata.pageConfig,
    categories: pageMetadata.pageConfig.categories.map((category) => {
      const newCategory = { ...category };
      newCategory.blocks = category.blocks.filter((block) => {
        return !blocksToRemove.some((b) => {
          return (
            b.title === block.title &&
            b.description === block.description &&
            b.footnote === block.footnote &&
            JSON.stringify(b.columns) === JSON.stringify(block.columns) &&
            b.type === block.type &&
            b.denom === block.denom &&
            b.startWithDenom === block.startWithDenom &&
            JSON.stringify(b.disasterBlockSpec) ===
              JSON.stringify(block.disasterBlockSpec) &&
            b.infoMessage === block.infoMessage
          );
        });
      });
      return newCategory;
    }),
  };
  return newPageMetadata;
}

/**
 * Extracts the main place from the fulfill data.
 *
 * @param fulfillData - The fulfill data to extract from.
 * @returns The main place extracted from the fulfill data.
 */
/* eslint-disable */
export function extractMainPlace(fulfillData: any): any {
  /* eslint-enable */
  return {
    dcid: fulfillData["place"]["dcid"],
    name: fulfillData["place"]["name"],
    types: [fulfillData["place"]["place_type"]],
  };
}
/**
 * Extracts the main place and metadata from the fulfill data.
 *
 * @param fulfillData - The fulfill data to extract from.
 * @returns A tuple containing the main place and metadata.
 */
/* eslint-disable */
export function extractMetadata(
  fulfillData: any,
  mainPlace: any
): SubjectPageMetadata {
  /* eslint-enable */
  const relatedThings = fulfillData["relatedThings"] || {};
  const pageMetadata: SubjectPageMetadata = {
    place: mainPlace,
    places: fulfillData["places"],
    pageConfig: fulfillData["config"],
    childPlaces: relatedThings["childPlaces"],
    peerPlaces: relatedThings["peerPlaces"],
    parentPlaces: relatedThings["parentPlaces"],
    parentTopics: relatedThings["parentTopics"],
    childTopics: relatedThings["childTopics"],
    peerTopics: relatedThings["peerTopics"],
    exploreMore: relatedThings["exploreMore"],
    mainTopics: relatedThings["mainTopics"],
    sessionId: "session" in fulfillData ? fulfillData["session"]["id"] : "",
    svSource: fulfillData["svSource"],
  };
  return pageMetadata;
}
