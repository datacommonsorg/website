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
 * A set of helper functions for building the citation list for the
 * metadata modal.
 */

import { intl } from "../../../i18n/i18n";
import { metadataComponentMessages } from "../../../i18n/i18n_metadata_messages";
import { NamedNode } from "../../../shared/types";
import { stripProtocol } from "../../../shared/util";
import { StatVarMetadata } from "./metadata";

export interface CitationPart {
  label: string;
  url?: string;
}

/**
 * This function builds the citation data object that later can
 * be used to either create a text citation string or a jsx-
 * based citation.
 */
export function buildCitationParts(
  statVars: NamedNode[],
  metadataMap: Record<string, StatVarMetadata[]>
): CitationPart[] {
  const seen = new Set<string>();
  const parts: CitationPart[] = [];

  statVars.forEach((statVar) => {
    const metadataList = metadataMap[statVar.dcid] || [];

    metadataList.forEach((metadata) => {
      if (
        !metadata ||
        !metadata.provenanceName ||
        seen.has(metadata.provenanceName)
      )
        return;

      seen.add(metadata.provenanceName);

      const label = metadata.sourceName
        ? `${metadata.sourceName}, ${metadata.provenanceName}`
        : metadata.provenanceName;

      const part: CitationPart = { label };
      if (metadata.provenanceUrl) {
        part.url = metadata.provenanceUrl.replace(/\/$/, "");
      }
      parts.push(part);
    });
  });

  parts.push({
    label: intl.formatMessage(metadataComponentMessages.MinorProcessing),
  });

  return parts;
}

/**
 * This function converts a citation (build by the function above)
 * into plain text (used for copying the function to the clipboard).
 */
export function citationToPlainText(parts: CitationPart[]): string {
  return parts
    .map((part) =>
      part.url ? `${part.label} (${stripProtocol(part.url)})` : part.label
    )
    .join(", ");
}
