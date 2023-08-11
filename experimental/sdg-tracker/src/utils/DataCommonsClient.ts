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

import { FulfillResponse, FullfillRequest } from "./types";

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
}
export default DataCommonsClient;
