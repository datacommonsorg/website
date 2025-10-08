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

import {
  CUSTOM_DC_API_PATH,
  DEFAULT_API_ENDPOINT,
  DEFAULT_API_V2_ENDPOINT,
} from "../../library/constants";
import { intl } from "../i18n/i18n";
import { chartComponentMessages } from "../i18n/i18n_chart_messages";
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
 * A manifest of special terms associated with an observation spec.
 * These can be used to provide a list of terms to be highlighted or
 * otherwise treated specially later.
 */
export interface ObservationSpecManifest {
  entities: string[];
  entityExpressions: string[];
  statVars: string[];
}

/**
 * Builds a manifest entities and statistical variables from a
 * list of observation specifications.
 * @param specs An array of `ObservationSpec` objects.
 * @returns An `ObservationSpecManifest` containing unique entities and stat vars.
 */
export function buildObservationSpecManifest(
  specs: ObservationSpec[]
): ObservationSpecManifest {
  const allEntities = new Set<string>();
  const allEntityExpressions = new Set<string>();
  const allStatVars = new Set<string>();

  for (const spec of specs) {
    (spec.entityDcids || []).forEach((e) => allEntities.add(e));
    if (spec.entityExpression) {
      allEntityExpressions.add(spec.entityExpression);
    }
    spec.statVarDcids.forEach((sv) => allStatVars.add(sv));
  }

  return {
    entities: Array.from(allEntities),
    entityExpressions: Array.from(allEntityExpressions),
    statVars: Array.from(allStatVars),
  };
}

/**
 * Determines if the given API endpoint points to a custom Data Commons instance.
 * @param endpoint
 * @returns True if the given endpoint is standard (not custom), otherwise false
 */
function isStandardDCEndpoint(endpoint: string): boolean {
  function normalizeEndpoint(url: string): string {
    return url.replace(/\/+$/, "").toLowerCase();
  }

  const standardEndpoints = [DEFAULT_API_ENDPOINT, DEFAULT_API_V2_ENDPOINT].map(
    normalizeEndpoint
  );
  return standardEndpoints.includes(normalizeEndpoint(endpoint));
}

/**
 * Determines if the given API root points to a custom Data Commons instance.
 * @param apiRoot The root URL for the Data Commons API.
 * @returns True if the apiRoot is for a custom DC, false otherwise.
 */
export function isCustomDataCommons(apiRoot?: string): boolean {
  if (apiRoot !== undefined) {
    // We are in a Web Component context. It's custom if the apiRoot is not a standard default endpoint.
    return !isStandardDCEndpoint(apiRoot);
  } else {
    // We are in the standard context. If isCustomDC exists and is set to zero, we are not a custom DC.
    // We have to check this way because custom DCs may not have this flag set, but primary DC always will.
    return globalThis.isCustomDC !== 0;
  }
}

/**
 * Builds the API V2 Observation url
 * @param isCustomDc A boolean indicating whether we are in a custom DC
 * @param apiRoot The root URL for the Data Commons API.
 * @returns The full path to the endpoint.
 */
function getApiV2ObservationUrl(
  isCustomDc: boolean,
  apiRoot: string | undefined
): string {
  if (isCustomDc) {
    if (apiRoot) {
      // If it is a custom DC and an apiRoot exists, apiRoot is the base
      return new URL(`${CUSTOM_DC_API_PATH}/v2/observation`, apiRoot).href;
    } else {
      // Otherwise use the current origin as the base.
      return `${window.location.origin}${CUSTOM_DC_API_PATH}/v2/observation`;
    }
  } else {
    // If it is a standard DC instance, use the default endpoint as the base.
    return `${DEFAULT_API_V2_ENDPOINT}/v2/observation`;
  }
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
 * Converts an ObservationSpec into a cURL command string.
 *
 * @param spec The observation specification to convert.
 * @param apiRoot The root URL for the Data Commons API.
 * @returns A formatted cURL command string.
 */
export function observationSpecToCurl(
  spec: ObservationSpec,
  apiRoot?: string
): string {
  const isCustomDc = isCustomDataCommons(apiRoot);

  const apiUrl = getApiV2ObservationUrl(isCustomDc, apiRoot);

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
 An interface used internally by the observationSpecsToPythonScript function
 to type the python payload.
 */
interface ApiPayloadPython {
  select: string[];
  date?: string;
  variable: {
    dcids: string[];
  };
  entity: {
    dcids?: string[];
    expression?: string;
  };
  filter?: Record<string, string[]>;
}

/**
 * This function formats the Python payload for the API call. We use this
 * rather than JSON.stringify because the latter function creates a format
 * that takes up a lot of space.
 * @param payload The API payload object.
 * @returns A formatted string for the Python script.
 */
function formatPythonPayload(payload: ApiPayloadPython): string {
  const lines: string[] = [];

  lines.push(`    "select": ${JSON.stringify(payload.select)}`);

  if (payload.date) {
    lines.push(`    "date": ${JSON.stringify(payload.date)}`);
  }

  if (payload.variable?.dcids) {
    const varDcids = JSON.stringify(payload.variable.dcids);
    lines.push(`    "variable": {\n        "dcids": ${varDcids}\n    }`);
  }

  if (payload.entity?.dcids) {
    const entityDcids = JSON.stringify(payload.entity.dcids);
    lines.push(`    "entity": {\n        "dcids": ${entityDcids}\n    }`);
  } else if (payload.entity?.expression) {
    const entityExpr = JSON.stringify(payload.entity.expression);
    lines.push(`    "entity": {\n        "expression": ${entityExpr}\n    }`);
  }

  if (payload.filter?.facet_ids) {
    const facetIds = JSON.stringify(payload.filter.facet_ids);
    lines.push(`    "filter": {\n        "facet_ids": ${facetIds}\n    }`);
  }

  return `{\n${lines.join(",\n")}\n}`;
}

/**
 * Converts a list of ObservationSpecs into a Python script.
 * Note that unlike curl, all requests will be in the same script.
 *
 * @param specs A list of observation specifications to convert.
 * @param statVarNameMap a lookup of stat var DCIDs to names
 * @param apiRoot The root URL for the Data Commons API.
 * @returns A formatted Python script string.
 */
export function observationSpecsToPythonScript(
  specs: ObservationSpec[],
  statVarNameMap: Record<string, string>,
  apiRoot?: string
): string {
  const isCustomDc = isCustomDataCommons(apiRoot);
  const apiUrl = getApiV2ObservationUrl(isCustomDc, apiRoot);

  // the introduction of the script with shared imports, headers and variables

  const headers = isCustomDc
    ? `headers = {'Content-Type': 'application/json'}`
    : `headers = {'Content-Type': 'application/json', 'X-API-Key': f'{api_key}'}`;

  const apiKeyLines = isCustomDc
    ? []
    : [`api_key = "API_KEY" # Replace with your API key`, ""];

  const introduction = [
    "import requests",
    "",
    ...apiKeyLines,
    `url = "${apiUrl}"`,
    headers,
  ];

  // we add a request for each endpoint.

  const apiCallBlocks = specs.map((spec, index) => {
    const payload: ApiPayloadPython = {
      select: ["entity", "variable", "date", "value", "facet"],
      variable: { dcids: spec.statVarDcids },
      entity: {},
    };

    if (spec.date) {
      payload.date = spec.date;
    }
    if (spec.entityDcids?.length > 0) {
      payload.entity = { dcids: spec.entityDcids };
    } else if (spec.entityExpression) {
      payload.entity = { expression: spec.entityExpression };
    }
    if (spec.filter?.facetIds?.length > 0) {
      const filterObject = {};
      filterObject["facet_ids"] = spec.filter.facetIds;
      payload.filter = filterObject;
    }

    const payloadString = formatPythonPayload(payload);

    // if we have more than one spec (endpoint) we have to suffix the relevant vars.
    const suffix = specs.length > 1 ? `_${index + 1}` : "";

    const statVarNames = spec.statVarDcids
      .map((id) => statVarNameMap[id] || id)
      .join(", ");
    const title =
      spec.role === "denominator"
        ? `${statVarNames} ${intl.formatMessage(
            chartComponentMessages.ApiDialogDenomHelperText
          )}`
        : statVarNames;

    const endpointIntroComment =
      specs.length > 1 && index > 0
        ? [`# ${title}`]
        : specs.length > 1
        ? [`# ${title}`]
        : [];

    const callBlock = [
      ...endpointIntroComment,
      `payload${suffix} = ${payloadString}`,
      `response${suffix} = requests.post(url, json=payload${suffix}, headers=headers)`,
      `print(response${suffix}.json())`,
    ];
    return callBlock.join("\n");
  });

  // we combine the introduction with each of the call blocks into our final script.
  return [introduction.join("\n"), ...apiCallBlocks].join("\n\n");
}

/**
 * This function formats the Python keyword arguments for a
 * Data Commons Client Python API call.
 * @param spec The observation specification object.
 * @returns A list of formatted argument strings for the Python script.
 */
function formatDataCommonsPythonClientArgs(spec: ObservationSpec): string[] {
  const params: string[] = [];
  params.push(`    variable_dcids=${JSON.stringify(spec.statVarDcids)}`);

  const date = spec.date === "" ? "latest" : spec.date;
  if (date && date !== "latest") {
    params.push(`    date='${date}'`);
  }

  if (spec.entityDcids?.length > 0) {
    params.push(`    entity_dcids=${JSON.stringify(spec.entityDcids)}`);
  } else if (spec.entityExpression) {
    params.push(
      `    entity_expression=${JSON.stringify(spec.entityExpression)}`
    );
  }

  if (spec.filter?.facetIds?.length > 0) {
    params.push(`    filter_facet_ids=${JSON.stringify(spec.filter.facetIds)}`);
  }
  return params;
}

/**
 * Converts a list of ObservationSpecs into a Python script that uses the
 * Data Commons Python Client library.
 *
 * @param specs A list of observation specifications to convert.
 * @param statVarNameMap a lookup of stat var DCIDs to names
 * @param apiRoot The root URL for the Data Commons API.
 * @returns A formatted Python script string.
 */
export function observationSpecsToDataCommonsClientScript(
  specs: ObservationSpec[],
  statVarNameMap: Record<string, string>,
  apiRoot?: string
): string {
  const isCustomDc = isCustomDataCommons(apiRoot);

  // the introduction of the script with shared imports, headers and variables

  const apiKeyLines = isCustomDc
    ? []
    : [`api_key = "API_KEY" # Replace with your API key`, ""];

  let clientInstantiationLine: string;
  if (isCustomDc) {
    let hostname = '"DC_HOSTNAME"';
    if (apiRoot) {
      try {
        hostname = `"${new URL(apiRoot).hostname}"`;
      } catch (e) {
        console.error(
          "Could not parse hostname from custom DC apiRoot:",
          apiRoot
        );
      }
    }
    clientInstantiationLine = `client = DataCommonsClient(dc_instance=${hostname})`;
  } else {
    clientInstantiationLine = `client = DataCommonsClient(api_key=api_key)`;
  }

  const introduction = [
    `# Requirements: pip install "datacommons-client[Pandas]"`,
    "import pandas as pd",
    "from datacommons_client.client import DataCommonsClient",
    "",
    ...apiKeyLines,
    clientInstantiationLine,
  ];

  // we add a request for each endpoint.

  const apiCallBlocks = specs.map((spec, index) => {
    const statVarNames = spec.statVarDcids
      .map((id) => statVarNameMap[id] || id)
      .join(", ");
    const title =
      spec.role === "denominator"
        ? `${statVarNames} ${intl.formatMessage(
            chartComponentMessages.ApiDialogDenomHelperText
          )}`
        : statVarNames;

    const endpointIntroComment = specs.length > 1 ? [`# ${title}`] : [];

    const params = formatDataCommonsPythonClientArgs(spec);
    const suffix = specs.length > 1 ? `_${index + 1}` : "";

    const callBlock = [
      ...endpointIntroComment,
      `response${suffix} = client.observation.fetch(`,
      params.join(",\n"),
      `)`,
      `df${suffix} = pd.DataFrame(response${suffix}.to_observation_records().model_dump())`,
      `print(df${suffix})`,
    ];

    return callBlock.join("\n");
  });

  return [introduction.join("\n"), ...apiCallBlocks].join("\n\n");
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
