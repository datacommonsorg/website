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
import { StatVarFacetDateRangeMap } from "../../../utils/tile_utils";
import { StatVarMetadata } from "./metadata";

export interface CitationPart {
  label: string;
  url?: string;
}

enum DatePrecision {
  year,
  month,
  day,
}

/**
 * This function returns the precision level of a date string.
 * @param date the date string in ISO format (YYYY-mm-dd, YYYY-mm, or YYYY).
 * @returns the precision of the date:
 *  YYYY-mm-dd: day
 *  YYYY-mm: month
 *  YYYY: year
 */
function getDatePrecision(date: string): DatePrecision {
  if (date.length === 10) return DatePrecision.day;
  if (date.length === 7) return DatePrecision.month;
  return DatePrecision.year;
}

/**
 * This function truncates a date string to the target date precision level.
 * This is used to ensure that date ranges with different dates are rendered
 * at the same precision level.
 * @param date the date string in ISO format (YYYY-mm-dd, YYYY-mm, or YYYY).
 * @param precision the precision of desired truncation.
 * @returns the date truncated to the given precision level:
 *  day: YYYY-mm-dd
 *  month: YYYY-mm
 *  year: YYYY
 */
function truncateDate(date: string, precision: DatePrecision): string {
  if (precision === DatePrecision.year) return date.substring(0, 4);
  if (precision === DatePrecision.month) return date.substring(0, 7);
  return date.substring(0, 10);
}

/**
 * This function takes a date range and returns a string version where each
 * end of the date range has a precision equal to the lowest precision of either
 * of the two dates. In other words, if the start date is "2020" and the end date
 * is "2025-05", the range will be "2020 - 2025".
 *
 * If the start and the end of the range are the same, a single date is returned.
 * If only one date is provided, that date is returned directly. If no dates are
 * provided, we return a blank string.
 *
 * Some examples are:
 *  ("2010-12-01", "2020") => "2010 – 2020"
 *  ("2010-12-01", "2020-05") => "2010-12 – 2020-05"
 *  ("2020-01", "2020-01") => "2020-01"
 *
 *  @param minDate a string representing the start of the range
 *  @param maxDate a string representing the end of the range
 *  @returns the formatted date range as per the above examples.
 */
export function formatDateRange(minDate?: string, maxDate?: string): string {
  if (!minDate && !maxDate) {
    return "";
  }
  if (!minDate) {
    return maxDate;
  }
  if (!maxDate) {
    return minDate;
  }

  // We start by determining the lower bound of the precision on the two dates
  const minPrecision = getDatePrecision(minDate);
  const maxPrecision = getDatePrecision(maxDate);
  const targetPrecision = Math.min(minPrecision, maxPrecision);

  // We then truncate the two dates to that precision.
  const formattedMin = truncateDate(minDate, targetPrecision);
  const formattedMax = truncateDate(maxDate, targetPrecision);

  if (formattedMin === formattedMax) return formattedMin;
  return `${formattedMin} – ${formattedMax}`;
}

// This interface is used internally by the citation parts function to map and collate provenance data
interface ProvenanceData {
  sourceName?: string;
  url?: string;
  minDate?: string;
  maxDate?: string;
}

/**
 * This function builds the citation data object that later can
 * be used to either create a text citation string or a jsx-
 * based citation.
 *
 * @param statVars - An array of `NamedNode` objects for the stat vars.
 * @param metadataMap - A mapping from stat var DCIDs to their metadata.
 * @param statVarFacetDateRanges - Optional. A map of stat vars to facet ids to their specific dates from the chart.
 * @param skipUrls - Optional. If true, provenance URLs are excluded.
 * @returns An array of `CitationPart` objects for rendering.
 */
export function buildCitationParts(
  statVars: NamedNode[],
  metadataMap: Record<string, StatVarMetadata[]>,
  statVarFacetDateRanges?: StatVarFacetDateRangeMap,
  skipUrls?: boolean
): CitationPart[] {
  const parts: CitationPart[] = [];
  // for the citation, we have to aggregate the stat var ranges to the provenance level
  const provenanceDataMap = new Map<string, ProvenanceData>();

  statVars.forEach((statVar) => {
    const metadataList = metadataMap[statVar.dcid] || [];

    metadataList.forEach((metadata) => {
      if (!metadata || !metadata.provenanceName) return;

      const provName = metadata.provenanceName;

      // if this is the first time we've seen this provenance, we add it to the map.
      if (!provenanceDataMap.has(provName)) {
        provenanceDataMap.set(provName, {
          sourceName: metadata.sourceName,
          url: metadata.provenanceUrl,
          minDate: undefined,
          maxDate: undefined,
        });
      }

      // we update the date range for the provenance (always expanding it where necessary)
      const facetId = metadata.facetId;
      const svDateRange =
        statVarFacetDateRanges && facetId
          ? statVarFacetDateRanges[statVar.dcid]?.[facetId]
          : undefined;

      if (svDateRange) {
        const entry = provenanceDataMap.get(provName);
        if (
          svDateRange.minDate &&
          (!entry.minDate || svDateRange.minDate < entry.minDate)
        ) {
          entry.minDate = svDateRange.minDate;
        }
        if (
          svDateRange.maxDate &&
          (!entry.maxDate || svDateRange.maxDate > entry.maxDate)
        ) {
          entry.maxDate = svDateRange.maxDate;
        }
      }
    });
  });

  // finally we loop through the provenance data map to build the final list.
  provenanceDataMap.forEach((data, provenanceName) => {
    let label = data.sourceName
      ? `${data.sourceName}, ${provenanceName}`
      : provenanceName;
    if (data.minDate && data.maxDate) {
      const dateString = formatDateRange(data.minDate, data.maxDate);
      label += ` (${dateString})`;
    }
    const part: CitationPart = { label };
    if (!skipUrls && data.url) {
      part.url = data.url.replace(/\/$/, "");
    }
    parts.push(part);
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
