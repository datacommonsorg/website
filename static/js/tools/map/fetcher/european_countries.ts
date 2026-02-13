/**
 * Copyright 2022 Google LLC
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
 * Fetch european countries.
 */

import { useEffect, useState } from "react";

import { EUROPE_NAMED_TYPED_PLACE } from "../../../shared/constants";
import { NamedPlace } from "../../../shared/types";
import { getEnclosedPlacesPromise } from "../../../utils/place_utils";

export function useFetchEuropeanCountries(): Array<NamedPlace> {
  const [data, setData] = useState<Array<NamedPlace>>([]);
  useEffect(() => {
    getEnclosedPlacesPromise(EUROPE_NAMED_TYPED_PLACE.dcid, "Country").then(
      (resp: Array<NamedPlace>) => {
        setData(resp);
        console.log("[Map Fetch] european countries");
      }
    );
  }, []);
  return data;
}
