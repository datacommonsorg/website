/**
 * Copyright 2024 Google LLC
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
 * Data Commons Client for interacting with web API (datacommons.org endpoint)
 */

import {
  ApiNodePropvalOutResponse,
  ObservationDatesApiResponse,
  PointApiResponse,
  SeriesApiResponse,
} from "./data_commons_web_client_types";
import { parseWebsiteApiRoot, toURLSearchParams } from "./utils";

export interface DatacommonsWebClientParams {
  apiRoot?: string;
}

class DataCommonsWebClient {
  /** Website API root */
  apiRoot?: string;

  constructor(params?: DatacommonsWebClientParams) {
    const p = params || {};
    this.apiRoot = parseWebsiteApiRoot(p.apiRoot);
  }

  /**
   * Fetches all node property values for the given property name
   * Uses /api/node/propvals/out endpoint
   * @param params.dcids List of DCIDs to fetch property values for
   * @param params.prop Property name to fetch
   */
  async getNodePropvals(params: {
    dcids: string[];
    prop: string;
  }): Promise<ApiNodePropvalOutResponse> {
    const url = `${this.apiRoot || ""}/api/node/propvals/out`;
    const response = await fetch(url, {
      body: JSON.stringify({
        dcids: params.dcids,
        prop: params.prop,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "post",
    });

    return (await response.json()) as ApiNodePropvalOutResponse;
  }

  /**
   * Fetches place/entity names
   * @param params.dcids list of entity DCIDs
   * @param params.prop optional entity name property
   */
  async getPlaceNames(params: {
    dcids: string[];
    prop?: string;
  }): Promise<Record<string, string>> {
    if (!params.dcids.length) {
      return Promise.resolve({});
    }
    const url = `${this.apiRoot || ""}/api/place/name`;
    const response = await fetch(url, {
      method: "post",
      body: JSON.stringify({
        dcids: params.dcids,
        prop: params.prop,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return (await response.json()) as Record<string, string>;
  }

  /**
   * Gets and processes the data from /api/observations/point endpoint
   * @param params.entities list of entitites to get data for
   * @param params.variables list of variables to get data for
   * @param params.date date to get the data for
   */
  async getObservationsPoint(params: {
    date?: string;
    entities: string[];
    variables: string[];
  }): Promise<PointApiResponse> {
    const queryString = toURLSearchParams({
      date: params.date,
      entities: params.entities,
      variables: params.variables,
    });
    const url = `${this.apiRoot || ""}/api/observations/point?${queryString}`;
    const response = await fetch(url);
    return (await response.json()) as PointApiResponse;
  }

  /**
   * Fetches point observations related to entities of type childType
   * that are contained within the specified parentEntity
   *
   * Uses /api/observations/point/within endpoint
   * @param params.childType type of entity to get data for
   * @param params.parentEntity the parent entity of the entities to get data for
   * @param params.variables list of variables to get data for
   * @param params.date date to get the data for
   */
  async getObservationsPointWithin(params: {
    parentEntity: string;
    childType: string;
    variables: string[];
    date?: string;
  }): Promise<PointApiResponse> {
    const queryString = toURLSearchParams({
      childType: params.childType,
      date: params.date,
      parentEntity: params.parentEntity,
      variables: params.variables,
    });
    const url = `${
      this.apiRoot || ""
    }/api/observations/point/within?${queryString}`;
    const response = await fetch(url);
    return (await response.json()) as PointApiResponse;
  }

  /**
   * Gets the data from /api/observations/series endpoint.
   * @param params.entities list of enitites to get data for
   * @param params.variables list of variables to get data for
   */
  async getObservationsSeries(params: {
    entities: string[];
    variables: string[];
  }): Promise<SeriesApiResponse> {
    const queryString = toURLSearchParams({
      entities: params.entities,
      variables: params.variables,
    });
    const url = `${this.apiRoot || ""}/api/observations/series?${queryString}`;
    const response = await fetch(url);
    return (await response.json()) as SeriesApiResponse;
  }

  /**
   * Gets observation series from child places within a parent place
   * Uses /api/observations/series/within endpoint
   * @param params.parentEntity parent place dcid to get the data for
   * @param params.childType place type to get the data for
   * @param params.variables variable dcids to get data for
   */
  async getObservationsSeriesWithin(params: {
    parentEntity: string;
    childType: string;
    variables: string[];
  }): Promise<SeriesApiResponse> {
    const queryString = toURLSearchParams({
      parentEntity: params.parentEntity,
      childType: params.childType,
      variables: params.variables,
    });
    const url = `${
      this.apiRoot || ""
    }/api/observations/series/within?${queryString}`;
    const response = await fetch(url);
    return (await response.json()) as SeriesApiResponse;
  }

  /**
   * Gets observation series from child places within a parent place
   * Uses /api/observations/series/within endpoint
   * @param params.parentEntity parent place dcid to get the data for
   * @param params.childType place type to get the data for
   * @param params.variables variable dcids to get data for
   */
  async getObservationDates(params: {
    parentEntity: string;
    childType: string;
    variable: string;
  }): Promise<ObservationDatesApiResponse> {
    const queryString = toURLSearchParams({
      parentEntity: params.parentEntity,
      childType: params.childType,
      variable: params.variable,
    });
    const url = `${this.apiRoot || ""}/api/observation-dates?${queryString}`;
    const response = await fetch(url);
    return (await response.json()) as ObservationDatesApiResponse;
  }
}

export { DataCommonsWebClient };
