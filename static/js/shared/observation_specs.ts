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
    // we group the numerator first.
    const effectiveDate = svSpec.date ?? defaultDate;
    // the `/v2/observation` does not have highest coverage capacity so we convert to "".
    const resolvedDate =
      effectiveDate === "HIGHEST_COVERAGE" ? "" : effectiveDate ?? "";
    const numeratorFacetIds = svSpec.facetId ? [svSpec.facetId] : undefined;
    const facetGroupKey = numeratorFacetIds
      ? numeratorFacetIds.sort().join(",")
      : "";
    const numeratorGroupKey = `num|date:${resolvedDate}|${entityGroupKey}|facet:${facetGroupKey}`;

    let numeratorGroup = numeratorGroups.get(numeratorGroupKey);
    if (!numeratorGroup) {
      numeratorGroup = {
        role: "numerator",
        statVarDcids: [],
        date: resolvedDate,
        ...entityPayload,
        filter: numeratorFacetIds ? { facetIds: numeratorFacetIds } : undefined,
      };
      numeratorGroups.set(numeratorGroupKey, numeratorGroup);
    }
    if (!numeratorGroup.statVarDcids.includes(svSpec.statVar)) {
      numeratorGroup.statVarDcids.push(svSpec.statVar);
    }

    // we then group the denominators
    if (svSpec.denom) {
      const denomFacetIds = getFacetIdsFromMap(svSpec.denom, statVarToFacets);
      const denomFacetKey = denomFacetIds ? denomFacetIds.sort().join(",") : "";
      const denomGroupKey = `${svSpec.denom}|${entityGroupKey}|${denomFacetKey}`;

      let denomGroup = denominatorGroups.get(denomGroupKey);
      if (!denomGroup) {
        denomGroup = {
          role: "denominator",
          statVarDcids: [svSpec.denom],
          date: "",
          ...entityPayload,
          filter: denomFacetIds ? { facetIds: denomFacetIds } : undefined,
          appliesTo: [svSpec.statVar],
        };
        denominatorGroups.set(denomGroupKey, denomGroup);
      } else if (!denomGroup.appliesTo?.includes(svSpec.statVar)) {
        denomGroup.appliesTo.push(svSpec.statVar);
      }
    }
  }

  return [...numeratorGroups.values(), ...denominatorGroups.values()];
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
  apiRoot: string
): string {
  const apiUrl = `${(apiRoot || "https://api.datacommons.org").replace(
    /\/$/,
    ""
  )}/v2/observation`;

  // we always select all fields
  const selectFields = ["entity", "variable", "date", "value", "facet"];

  const params: string[] = [];

  params.push(`"date": "${spec.date ?? ""}"`);

  params.push(
    `"variable": {"dcids": [${spec.statVarDcids
      .map((v) => `"${v}"`)
      .join(",")}]}`
  );

  // we push a list of entity (place ids or the expression, depending on which is given
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
    `  -H "X-API-Key: {API_KEY}" \\`,
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
