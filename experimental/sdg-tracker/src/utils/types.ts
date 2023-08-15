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
export interface ChartConfigTile {
  description: string;
  statVarKey: string[];
  title: string;
  type: "BAR" | "LINE" | "MAP" | "HIGHLIGHT" | "GAUGE";
}
export interface ChartConfigColumn {
  tiles: ChartConfigTile[];
}
export interface ChartConfigBlock {
  columns: ChartConfigColumn[];
}
export interface ChartConfigCategory {
  blocks: ChartConfigBlock[];
  dcid: string;
  statVarSpec: {
    [dcid: string]: {
      name: string;
      statVar: string;
    };
  };
  title: string;
}
export interface ChartConfig {
  categories?: ChartConfigCategory[];
  metadata?: {
    containedPlaceTypes: {
      Place: string;
    };
    placeDcid: string[];
    topicId: string;
    topicName: string;
  };
}
export interface Place {
  dcid: string;
  name: string;
  place_type: string;
}
export interface RelatedPlace {
  dcid: string;
  name: string;
  types: string[];
}
export interface RelatedTopic {
  dcid: string;
  name: string;
  types: string[];
}

export interface RelatedThings {
  childPlaces: {
    [placeType: string]: RelatedPlace[];
  };
  mainTopic: RelatedTopic;
  parentPlaces: RelatedPlace[];
  parentTopics: RelatedTopic[];
  peerTopics: RelatedTopic[];
}

/**
 * See https://github.com/datacommonsorg/website/blob/3af489f2a2551c8e688d9dcf6a81dab5a3e5d717/server/lib/nl/common/utterance.py#L95
 * for descriptions
 */
export type FulfillmentResult =
  | "CURRENT_QUERY"
  | "PAST_QUERY"
  | "PARTIAL_PAST_QUERY"
  | "DEFAULT"
  | "UNFULFILLED"
  | "UNRECOGNIZED";

/**
 * API payload for /fullfill
 */
export interface FullfillRequest {
  dc?: "sdg";
  entities: string[]; // Example: ["Earth"]
  variables: string[]; // Example: ["dc/topic/sdg"]
  childEntityType: string;
  comparisonEntities: string[];
  comparisonVariables: string[];
}

/**
 * API Response from /fullfill endpoint
 */
export interface FulfillResponse {
  config: ChartConfig;
  context: any; // Not currently used; define interface later if needed
  debug: any; // Not currently used; define interface later if needed
  failure?: string;
  place: Place;
  placeFallback: any; // Not currently used; define interface later if needed
  placeSource: FulfillmentResult;
  relatedThings: RelatedThings;
  session: any;
  svSource: FulfillmentResult;
  userMessage: string;
}

/**
 * API payload for /detect
 */
export interface DetectRequest {
  contextHistory: any[]; // Deliberately left definition out. Use value from previous queries
  dc: "sdg";
}

/**
 * API response from /detect endpoint
 */
export interface DetectResponse {
  childEntityType: string;
  comparisonEntities: string[];
  comparisonVariables: string[];
  context: any[]; // Definition deliberately omitted. Will use this as a black box to pass to subsequent queries.
  debug: any; // Not currently used; define interface later if needed
  entities?: string[]; // place DCIDs
  failure?: string;
  session: any; // Not currently used; define interface later if needed
  sessionId: string;
  variables?: string[];
}
