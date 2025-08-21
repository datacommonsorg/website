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
 * This file contains helper functions to construct specifications
 * for querying observations in the Data Commons API. These specifications
 * are currently used to build curl calls that are given to the user
 * in the API dialog. However, they can be used more generally to
 * represent the specifications of a set of observations and could be
 * hydrated into other formats.
 */

import { CUSTOM_DC_API_PATH, DEFAULT_API_ROOT } from "./constants";
import { StatVarFacetMap, StatVarSpec } from "./types";

/*
 * Defines the structure for a single observation query, which can be either a
 * numerator or a denominator in a statistical calculation.
 */
export interface ObservationSpec {
  // a role indicating the observation is either numerator or denom
  role: "numerator" | "denominator";
  // an array of the stat var dcids associated with this observation
  statVarDcids: string[];
  // An array of the entity (places) DCIDs associated with the observation
  entityDcids?: string[];
  // A Data Commons entity expression to select entities (e.g., 'country/USA->county').
  entityExpression?: string;
  // The specific date to fetch the observation for in 'YYYY-MM-DD' format.
  // An empty date retrieve tha latest.
  // Defaults to empty.
  date?: string;
  // An optional filter to apply to the observation query.
  filter?: {
    // A list of facet ids to filter the query by
    facetIds?: string[];
  };
  // an array of the numerators to which a denominator applies
  appliesTo?: string[];
}

/*
 * Defines the options required to build a set of observation specifications.
 */
export interface ObservationSpecOptions {
  // an array of the stat var specs associated with this observation
  statVarSpecs: StatVarSpec[];
  // an optional mapping of stat vars to their facets
  statVarToFacets?: StatVarFacetMap;
  // An array of the place DCIDs associated with the observation
  placeDcids?: string[];
  // A Data Commons entity expression to select entities (e.g., 'country/USA->county').
  // This cannot be used in conjunction with a list of place DCIDs.
  entityExpression?: string;
  // A default date to use for statistical variables that do not specify one. */
  defaultDate?: string;
}

/**
 * Builds a list of observation specifications.
 * This grouping optimizes API calls by combining variables that share the same
 * date, place, and facet (i.e. information that can be included in a single
 * query to the observation endpoint).
 *
 * @param options The options for building the observation specifications.
 * @returns An array of grouped `ObservationSpec` objects.
 */
export function buildObservationSpecs(
  options: ObservationSpecOptions
): ObservationSpec[] {
  const {
    statVarSpecs,
    statVarToFacets,
    placeDcids,
    entityExpression,
    defaultDate,
  } = options;

  const hasDcids = Array.isArray(placeDcids) && placeDcids.length > 0;
  const hasExpr =
    typeof entityExpression === "string" && entityExpression.length > 0;

  if ((hasDcids && hasExpr) || (!hasDcids && !hasExpr)) {
    /*
      If we try to give entities both through a list of DCIDs and through an expression, the API
      call does resolve, but the expression part is ignored. The documentation implies that these
      should be exclusive.
     */
    throw new Error(
      "buildObservationSpecs: Provide either `placeDcids` or `entityExpression` (but not both)."
    );
  }

  // A reusable entity payload (this will appear in every observation spec created).
  const entityPayload = hasDcids
    ? { entityDcids: placeDcids }
    : { entityExpression: entityExpression as string };

  /*
    If the places, date and filters (facets) are the same, we can group multiple stat vars into the same
    API endpoint. We do this by creating a key out of those elements and mapping that key to the spec.
    A note that numerators and denominators will be grouped separately.
   */
  const numeratorGroups = new Map<string, ObservationSpec>();
  const denominatorGroups = new Map<string, ObservationSpec>();

  const entityGroupKey = hasDcids
    ? `dcids:${placeDcids.join(",")}`
    : `expr:${entityExpression}`;

  for (const svSpec of statVarSpecs) {
    groupNumerator(
      svSpec,
      defaultDate,
      entityPayload,
      entityGroupKey,
      numeratorGroups
    );

    if (svSpec.denom) {
      groupDenominator(
        svSpec,
        statVarToFacets,
        entityPayload,
        entityGroupKey,
        denominatorGroups
      );
    }
  }

  return [...numeratorGroups.values(), ...denominatorGroups.values()];
}

/**
 * Groups a numerator statistical variable into the appropriate observation spec.
 * @param svSpec The statistical variable specification.
 * @param defaultDate A default date to use if none is specified in svSpec.
 * @param entityPayload The shared entity dcids or expression for the query.
 * @param entityGroupKey A key representing the entity part of the query.
 * @param numeratorGroups A map for grouping numerators.
 */
function groupNumerator(
  svSpec: StatVarSpec,
  defaultDate: string | undefined,
  entityPayload: { entityDcids?: string[] } | { entityExpression?: string },
  entityGroupKey: string,
  numeratorGroups: Map<string, ObservationSpec>
): void {
  const effectiveDate = svSpec.date || defaultDate;
  const resolvedDate =
    effectiveDate === "HIGHEST_COVERAGE" ? "" : effectiveDate ?? "";
  const facetIds = svSpec.facetId ? [svSpec.facetId] : undefined;
  const facetGroupKey = facetIds ? facetIds.join(",") : "";
  const groupKey = `num|date:${resolvedDate}|${entityGroupKey}|facet:${facetGroupKey}`;

  let group = numeratorGroups.get(groupKey);
  if (!group) {
    group = {
      role: "numerator",
      statVarDcids: [],
      date: resolvedDate,
      ...entityPayload,
      filter: facetIds ? { facetIds } : undefined,
    };
    numeratorGroups.set(groupKey, group);
  }

  if (!group.statVarDcids.includes(svSpec.statVar)) {
    group.statVarDcids.push(svSpec.statVar);
  }
}

/**
 * Groups a denominator statistical variable into the appropriate observation spec.
 * @param svSpec The statistical variable specification containing the denominator.
 * @param statVarToFacets A map of stat vars to their facets.
 * @param entityPayload The shared entity dcids or expression for the query.
 * @param entityGroupKey A key representing the entity part of the query.
 * @param denominatorGroups A map for grouping denominators.
 */
function groupDenominator(
  svSpec: StatVarSpec,
  statVarToFacets: StatVarFacetMap | undefined,
  entityPayload: { entityDcids?: string[] } | { entityExpression?: string },
  entityGroupKey: string,
  denominatorGroups: Map<string, ObservationSpec>
): void {
  if (!svSpec.denom) {
    return;
  }
  const denomDcid = svSpec.denom;
  const facetIds = getFacetIdsFromMap(denomDcid, statVarToFacets);
  const facetKey = facetIds ? facetIds.sort().join(",") : "";
  const groupKey = `${denomDcid}|${entityGroupKey}|${facetKey}`;

  let group = denominatorGroups.get(groupKey);
  if (!group) {
    group = {
      role: "denominator",
      statVarDcids: [denomDcid],
      date: "",
      ...entityPayload,
      filter: facetIds ? { facetIds } : undefined,
      appliesTo: [svSpec.statVar],
    };
    denominatorGroups.set(groupKey, group);
  } else if (!group.appliesTo?.includes(svSpec.statVar)) {
    group.appliesTo.push(svSpec.statVar);
  }
}

/**
 * Converts an ObservationSpec into a cURL command string for debugging API calls.
 *
 * @param spec The observation specification to convert.
 * @param apiRoot The root URL for the Data Commons API.
 * @returns A formatted cURL command string.
 */
export function observationSpecToCurl(
  spec: ObservationSpec,
  apiRoot?: string
): string {
  const isCustomDc = apiRoot && apiRoot !== DEFAULT_API_ROOT;

  const apiUrl = isCustomDc
    ? new URL(`${CUSTOM_DC_API_PATH}/v2/observation`, apiRoot).href
    : `${DEFAULT_API_ROOT}/v2/observation`;

  const authHeader = isCustomDc ? [] : [`  -H "X-API-Key: \${API_KEY}" \\`];

  // we always select all fields
  const selectFields = ["entity", "variable", "date", "value", "facet"];

  const params: string[] = [];

  if (spec.date) {
    params.push(`"date": "${spec.date}"`);
  }

  params.push(
    `"variable": {"dcids": [${spec.statVarDcids
      .map((v) => `"${v}"`)
      .join(",")}]}`
  );

  // we push a list of entity (place ids or the expression, depending on which is given)
  if (spec.entityDcids?.length > 0) {
    params.push(
      `"entity": {"dcids": [${spec.entityDcids
        .map((e) => `"${e}"`)
        .join(",")}]}`
    );
  } else if (spec.entityExpression) {
    params.push(`"entity": {"expression": "${spec.entityExpression}"}`);
  }

  // we join the select fields together and add them to the params
  params.push(`"select": [${selectFields.map((s) => `"${s}"`).join(",")}]`);

  // if we are filtering by facet ids (i.e. if facets has been selected for the stat vars),
  // we push the filter section onto the params with the selected facets
  if (spec.filter?.facetIds?.length > 0) {
    params.push(
      `"filter": {"facet_ids": [${spec.filter.facetIds
        .map((f) => `"${f}"`)
        .join(",")}]}`
    );
  }

  const jsonBody = params.map((p) => `    ${p}`).join(",\n");
  const dataPayload = `-d '{\n${jsonBody}\n  }'`;

  return [
    `curl -X POST \\`,
    ...authHeader,
    `  -H "Content-Type: application/json" \\`,
    `  "${apiUrl}" \\`,
    `  ${dataPayload}`,
  ].join("\n");
}

/**
 * Retrieves facet IDs for a given statistical variable from the facet map.
 * This is used to find the correct facets for a denominator.
 *
 * @param svDcid The DCID of the statistical variable.
 * @param statVarToFacets The map of stat var DCIDs to their associated facet IDs.
 * @returns An array of facet IDs, or undefined if none are found.
 */
function getFacetIdsFromMap(
  svDcid: string,
  statVarToFacets?: StatVarFacetMap
): string[] | undefined {
  const facetSet = statVarToFacets?.[svDcid];

  if (!facetSet || facetSet.size === 0) {
    return undefined;
  }

  return Array.from(facetSet);
}
