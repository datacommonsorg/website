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

import { Place } from "../state";
import { BulkObservationExistenceRequest, DetectRequest, FulfillResponse, FullfillRequest } from "./types";

interface DatacommonsClientParams {
  apiRoot?: string;
}

class DataCommonsClient {
  apiRoot: string;

  constructor(params: DatacommonsClientParams) {
    this.apiRoot = params.apiRoot || "https://datacommons.org";
  }

  async fulfill(payload: FullfillRequest): Promise<FulfillResponse> {
    const url = `${this.apiRoot}/api/explore/fulfill`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return (await response.json()) as FulfillResponse;
  }

  async detectAndFulfill(
    query: string,
    context?: any[]
  ): Promise<FulfillResponse> {
    const url = `${this.apiRoot}/api/explore/detect-and-fulfill`;
    const urlWithSearchParams = `${url}?${new URLSearchParams({ q: query })}`;
    const response = await fetch(urlWithSearchParams, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        contextHistory: context ? context : [],
        dc: "sdg",
      } as DetectRequest),
    });
    return (await response.json()) as FulfillResponse;
  }

  async getPlaces(placeTypes: string[]): Promise<Place[]> {
    let url = `${this.apiRoot}/api/node/propvals/in?prop=typeOf`;
    placeTypes.forEach((type) => {
      url += `&dcids=${type}`;
    })
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      }
    })
    const responseJson = await response.json();
    const result: Place[] = [];
    placeTypes.forEach((placeType) => {
      const placeTypeResult = responseJson[placeType];
      placeTypeResult.forEach((place: any) => {
        // Only return places with name property because that is needed for the
        // backend to work.
        if (!place || !place.dcid || !place.name) {
          return;
        }
        result.push({ dcid: place.dcid, name: place.name });
      })
    })
    return result;
  }

  async existence(payload: BulkObservationExistenceRequest): Promise<any> {
    const url = `${this.apiRoot}/api/observation/existence`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return (await response.json()) as any;
  }
}
export default DataCommonsClient;
