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

// This component is used to show place name given the place DCID.
// It can be used in other component to fetch and show place names
// asynchronously.

import React, { useEffect, useState } from "react";

import { intl } from "../i18n/i18n";
import { ABORT_CONTROLLER_CANCELLED } from "../shared/constants";
import { isUSACountyOrCity } from "../tools/shared_util";
import { getPlaceDisplayNames, getPlaceNames } from "../utils/place_utils";

export interface PlaceNameProp {
  dcid: string;
  apiRoot?: string;
}

export function PlaceName(props: PlaceNameProp): JSX.Element {
  // We want the display name (gets name with state code if available) if
  // parent place is USA
  const [name, setName] = useState<string>("");

  useEffect(() => {
    const controller = new AbortController();
    const placeNamesPromise = isUSACountyOrCity(props.dcid)
      ? getPlaceDisplayNames([props.dcid], {
          apiRoot: props.apiRoot,
          signal: controller.signal,
          locale: intl.locale,
        })
      : getPlaceNames([props.dcid], {
          apiRoot: props.apiRoot,
          signal: controller.signal,
          locale: intl.locale,
        });

    placeNamesPromise
      .then((resp) => {
        if (props.dcid in resp) {
          setName(resp[props.dcid]);
        } else {
          setName(props.dcid);
        }
      })
      .catch((e) => {
        if (e?.code === ABORT_CONTROLLER_CANCELLED) {
          return;
        }
        setName(props.dcid);
      });

    return () => {
      // Abort async requests when component is unmounted
      controller.abort();
    };
  }, [props.dcid, props.apiRoot]);

  return <>{name}</>;
}
