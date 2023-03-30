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
 * Types for the NL interface.
 */

import { NamedTypedPlace } from "../../shared/types";
import { SubjectPageConfig } from "../../types/subject_page_proto_types";

export interface SearchResult {
  place: NamedTypedPlace;
  config: SubjectPageConfig;
}

export interface MultiSVCandidatePart {
  QueryPart: string;
  SV: Array<string>;
  CosineScore: Array<number>;
}

export interface MultiSVCandidate {
  Parts: Array<MultiSVCandidatePart>;
  AggCosineScore: number;
  DelimBased: boolean;
}

export interface MultiSVScores {
  Candidates: Array<MultiSVCandidate>;
}

export interface SVScores {
  SV: Map<number, string>;
  CosineScore: Map<number, number>;
  MultiSV: MultiSVScores;
}

export interface DebugInfo {
  status: string;
  originalQuery: string;
  placesDetected: Array<string>;
  placesResolved: string;
  mainPlaceDCID: string;
  mainPlaceName: string;
  queryWithoutPlaces: string;
  svScores: SVScores;
  svSentences: Map<string, Array<string>>;
  rankingClassification: string;
  overviewClassification: string;
  sizeTypeClassification: string;
  timeDeltaClassification: string;
  comparisonClassification: string;
  containedInClassification: string;
  correlationClassification: string;
  eventClassification: string;
}
