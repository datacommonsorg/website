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
  PointApiResponse,
  SeriesApiResponse,
} from "./data_commons_web_client_types";
import { toURLSearchParams } from "./utils";

export interface DatacommonsWebClientParams {
  /** Web api root endpoint. Default: `"https://datacommons.org/"` */
  apiRoot?: string;
}

class DataCommonsWebClient {
  apiRoot?: string;

  constructor(params?: DatacommonsWebClientParams) {
    const p = params || {};
    this.apiRoot = p.apiRoot
      ? p.apiRoot.replace(/\/$/, "")
      : "https://datacommons.org";
  }

  /**
   * Fetches all node property values for the given property name
   * @param params
   * @returns
   */
  async getNodePropvals(params: {
    dcids: string[];
    prop: string;
  }): Promise<ApiNodePropvalOutResponse> {
    const url = `${this.apiRoot || ""}/api/node/propvals/out`;
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

    return (await response.json()) as ApiNodePropvalOutResponse;
  }

  /**
   * Fetches place/entity names
   * @param entityDcids list of entity DCIDs
   * @param prop optional entity name property
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
   * @param entities list of entitites to get data for
   * @param variables list of variables to get data for
   * @param date date to get the data for
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
   * @param childType type of entity to get data for
   * @param parentEntity the parent entity of the entities to get data for
   * @param variables list of variables to get data for
   * @param date date to get the data for
   */
  async getObservationsPointWithin(params: {
    parentEntity: string;
    childType: string;
    variables: string[];
    date?: string;
  }): Promise<PointApiResponse> {
    const queryString = toURLSearchParams({
      parentEntity: params.parentEntity,
      childType: params.childType,
      variables: params.variables,
      date: params.date,
    });
    const url = `${
      this.apiRoot || ""
    }/api/observations/point/within?${queryString}`;
    const response = await fetch(url);
    return (await response.json()) as PointApiResponse;
  }

  /**
   * Gets the data from /api/observations/series endpoint.
   * @param entities list of enitites to get data for
   * @param variables list of variables to get data for
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
   * Gets the data from /api/observations/series/within endpoint.
   * @param parentEntity parent place to get the data for
   * @param childType place type to get the data for
   * @param variables variables to get data for
   * @returns
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
}
export { DataCommonsWebClient };
