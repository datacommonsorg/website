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

/**
 * A collection of metadata-related types used by the metadata modal.
 */

import { NamedTypedNode, ProvenanceLiteral } from "../../../shared/types";

/**
 * The StatVarMetadata is the interface used by the Metadata modal
 * to collate the information pulled from the various API endpoints.
 *
 * Unlike the other interfaces in this collection, this interface does
 * not directly represent the shape of an API call return.
 */
export interface StatVarMetadata {
  statVarId: string; // DCID of the stat var
  statVarName: string; // Label of the stat var
  categories: string[]; // Category names of the stat var (e.g., "Demographics")
  sourceName?: string; // Source name
  provenanceUrl?: string; // Provenance source URL
  provenanceName?: string; // Provenance source name
  dateRangeStart?: string; // Start date
  dateRangeEnd?: string; // End date
  periodicity?: string; // The pub. cadence, ISO 8601 duration (e.g., "P1Y")
  unit?: string; // Unit (e.g., "Years")
  observationPeriod?: string; // ISO 8601 duration string (e.g., "P1Y")
  license?: string; // License type
  licenseDcid?: string; // The DCID for the license (for linking)
  measurementMethod?: string; // The DCID for the measurement method
  measurementMethodDescription?: string; // Measurement method description
}

type LiteralArray = ProvenanceLiteral[];
type NodeArray = NamedTypedNode[];

/**
 * The return result of a call to node/triples/out for a data source
 *
 * e.g. /api/node/triples/out/dc/base/{source dcid}
 */
export interface Provenance {
  cachedSourceDataUrl?: LiteralArray;
  curator?: NodeArray;
  dataBuildGroup?: LiteralArray;
  dataTransformationLogic?: LiteralArray;
  descriptionUrl?: LiteralArray;
  earliestObservationDate?: LiteralArray;
  entityResolutionType?: NodeArray;
  importTime?: LiteralArray;
  isPartOf?: NodeArray;
  lastDataRefreshDate?: LiteralArray;
  latestObservationDate?: LiteralArray;
  license?: LiteralArray;
  licenseType?: NodeArray;
  name?: LiteralArray;
  nextDataRefreshDate?: LiteralArray;
  preResolutionDownloadVersionFile?: LiteralArray;
  preResolutionTableUrl?: LiteralArray;
  processingMethod?: NodeArray;
  provenance?: NodeArray;
  provenanceCategory?: NodeArray;
  resolvedProtoMcfUrl?: LiteralArray;
  source?: NodeArray;
  sourceDataUrl?: LiteralArray;
  sourceReleaseFrequency?: LiteralArray;
  typeOf?: NodeArray;
  url?: LiteralArray;
}

/**
 * The series key is a section located in the series summary
 * in one of the provenance summaries of a stat var API call.
 */
export interface SeriesKey {
  measurementMethod?: string;
  observationPeriod?: string;
  scalingFactor?: string;
  unit?: string;
  isDcAggregate?: boolean;
}

/**
 * The series summary is located under each provenance summary
 * of a stat var API call.
 */
export interface SeriesSummary {
  earliestDate?: string;
  latestDate?: string;
  seriesKey?: SeriesKey;
}

/**
 * The provenance summary is the summary for a particular
 * provenance underneath a particular stat var.
 */
export interface StatVarProvenanceSummary {
  releaseFrequency?: string;
  seriesSummary?: SeriesSummary[];
}

/**
 * A map of provenance summaries, found in the API call
 * for a particular stat var.
 */
export interface StatVarProvenanceSummaries {
  provenanceSummary?: Record<string, StatVarProvenanceSummary>;
}
