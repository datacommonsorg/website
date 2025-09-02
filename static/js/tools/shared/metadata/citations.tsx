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
import React, { Fragment, ReactNode } from "react";

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
 *
 * @param statVars - An array of `NamedNode` objects for the stat vars.
 * @param metadataMap - A mapping from stat var DCIDs to their metadata.
 * @param skipUrls - Optional. If true, provenance URLs are excluded.
 * @returns An array of `CitationPart` objects for rendering.
 */
export function buildCitationParts(
  statVars: NamedNode[],
  metadataMap: Record<string, StatVarMetadata[]>,
  skipUrls?: boolean
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
      if (!skipUrls && metadata.provenanceUrl) {
        part.url = metadata.provenanceUrl.replace(/\/$/, "");
      }
      parts.push(part);
    });
  });

  if (parts.length !== 0) {
    parts.push({
      label: intl.formatMessage(metadataComponentMessages.MinorProcessing),
    });
  }

  return parts;
}

/**
 * This function converts a citation (build by the function above)
 * into plain text (used for copying the function to the clipboard).
 *
 * @param parts - The array of `CitationPart` objects to convert.
 * @returns A single, comma-separated string representing the citation.
 */
export function citationToPlainText(parts: CitationPart[]): string {
  return parts
    .map((part) =>
      part.url ? `${part.label} (${stripProtocol(part.url)})` : part.label
    )
    .join(", ");
}

/**
 * Helper to join an array of ReactNodes with a separator.
 *
 * @param nodes - The array of `ReactNode` elements to join.
 * @param separator - The `ReactNode` to place between elements.
 * @returns A new array of `ReactNode`s with the separator interspersed.
 */
function joinReactNodes(
  nodes: ReactNode[],
  separator: ReactNode = ", "
): ReactNode[] {
  return nodes.flatMap((node, idx) => (idx === 0 ? [node] : [separator, node]));
}

/**
 * Converts an array of citation parts into an array of React nodes for
 * display.
 *
 * @param parts - The array of `CitationPart` objects to render.
 * @returns An array of `ReactNode`s representing the formatted citation.
 */
export function buildCitationNodes(parts: CitationPart[]): ReactNode[] {
  const nodes = parts.map(({ label, url }) => {
    if (url) {
      const urlDisplay = stripProtocol(url);
      return (
        <Fragment key={label}>
          {label} (
          <a href={url} target="_blank" rel="noreferrer">
            {urlDisplay}
          </a>
          )
        </Fragment>
      );
    }
    return label;
  });
  return joinReactNodes(nodes);
}
