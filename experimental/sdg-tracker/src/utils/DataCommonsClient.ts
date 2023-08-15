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

import {
  DetectRequest,
  DetectResponse,
  FulfillResponse,
  FullfillRequest,
} from "./types";

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

  async detect(query: string, context?: any[]): Promise<DetectResponse> {
    const url = `${this.apiRoot}/api/explore/detect`;
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
    return (await response.json()) as DetectResponse;
  }
}
export default DataCommonsClient;
