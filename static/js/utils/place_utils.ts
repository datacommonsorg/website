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

import axios from "axios";
import _ from "lodash";

import {
  EARTH_NAMED_TYPED_PLACE,
  IPCC_PLACE_50_TYPE_DCID,
  THING_PLACE_TYPE,
} from "../shared/constants";
import { DisplayNameApiResponse } from "../shared/stat_types";
import {
  ChildPlacesByType,
  NamedPlace,
  NamedTypedPlace,
} from "../shared/types";
import { ALL_MAP_PLACE_TYPES } from "../tools/map/util";

let ps: google.maps.places.PlacesService;

const DEFAULT_SAMPLE_SIZE = 50;
// Place and place type combinations where all children places should be
// returned as sample places.
const SAMPLE_PLACES_ALL = {
  [EARTH_NAMED_TYPED_PLACE.dcid]: new Set(["Country"]),
};

export const ENCLOSED_PLACE_TYPE_NAMES = {
  [IPCC_PLACE_50_TYPE_DCID]: "0.5 Arc Degree",
};

/**
 * Get a subset of the list of places that are of childPlaceType and are
 * children of the parentPlace
 * @param parentPlace
 * @param childPlaceType
 * @param childrenPlaces
 * @param sampleSize
 */
export function getSamplePlaces(
  parentPlace: string,
  childPlaceType: string,
  childrenPlaces: Array<NamedPlace>,
  sampleSize?: number
): Array<NamedPlace> {
  if (
    parentPlace in SAMPLE_PLACES_ALL &&
    SAMPLE_PLACES_ALL[parentPlace].has(childPlaceType)
  ) {
    return childrenPlaces;
  }
  return _.sampleSize(childrenPlaces, sampleSize || DEFAULT_SAMPLE_SIZE);
}

/**
 * Used to get parent places
 * @param placeDcid the place to get parent places for
 */
export function getParentPlacesPromise(
  placeDcid: string,
  apiRoot?: string
): Promise<Array<NamedTypedPlace>> {
  return axios
    .get(`${apiRoot || ""}/api/place/parent?dcid=${placeDcid}`)
    .then((resp) => {
      const parentsData = resp.data;
      const filteredParentsData = parentsData.filter((parent) => {
        return parent.type in ALL_MAP_PLACE_TYPES;
      });
      const parentPlaces = filteredParentsData.map((parent) => {
        return { dcid: parent.dcid, name: parent.name, types: [parent.type] };
      });
      if (placeDcid !== EARTH_NAMED_TYPED_PLACE.dcid) {
        parentPlaces.push(EARTH_NAMED_TYPED_PLACE);
      }
      return parentPlaces;
    })
    .catch(() => []);
}

/**
 * Used to get child places (filtered by wanted place type list).
 * Returns lists of NamedPopPlace keyed by place type.
 */
export function getChildPlacesPromise(
  placeDcid: string
): Promise<ChildPlacesByType> {
  return axios
    .get(`/api/place/child/${placeDcid}`)
    .then((resp) => {
      return resp.data;
    })
    .catch(() => {
      return {};
    });
}

/**
 * Used to get enclosed places
 * @param placeDcid the place to get enclosed places for
 * @param childPlaceType the type of enclosed places to get
 */
export function getEnclosedPlacesPromise(
  placeDcid: string,
  childPlaceType: string
): Promise<Array<NamedPlace>> {
  return axios
    .get(
      `/api/place/descendent?dcids=${placeDcid}&descendentType=${childPlaceType}`
    )
    .then((resp) => {
      const enclosedPlaces = resp.data[placeDcid];
      if (_.isEmpty(enclosedPlaces)) {
        return [];
      }
      return enclosedPlaces.map((dcid) => {
        return {
          dcid,
          name: dcid,
        };
      });
    });
}

/**
 * Given the dcid of a place, returns a promise with the rest of the place
 * information
 * @param placeDcid
 */
export function getNamedTypedPlace(
  placeDcid: string
): Promise<NamedTypedPlace> {
  if (placeDcid === EARTH_NAMED_TYPED_PLACE.dcid) {
    return Promise.resolve(EARTH_NAMED_TYPED_PLACE);
  }
  // TODO: do both these together in a new flask endpoint after new cache with
  // parents, name, and type information is added.
  const placeTypePromise = axios
    .get(`/api/place/type/${placeDcid}`)
    .then((resp) => resp.data);
  const placeNamePromise = axios
    .get(`/api/place/name?dcids=${placeDcid}`)
    .then((resp) => resp.data);
  return Promise.all([placeTypePromise, placeNamePromise])
    .then(([placeType, placeName]) => {
      const name = placeDcid in placeName ? placeName[placeDcid] : placeDcid;
      return { dcid: placeDcid, name, types: [placeType] };
    })
    .catch(() => {
      return { dcid: placeDcid, name: "", types: [] };
    });
}

/**
 * Given a list of place dcids, returns a promise with a map of dcids to place
 * names
 */
export function getPlaceNames(
  dcids: string[],
  options?: {
    apiRoot?: string;
    prop?: string;
    signal?: AbortSignal;
  }
): Promise<{ [key: string]: string }> {
  if (!dcids.length) {
    return Promise.resolve({});
  }
  const requestOptions = options?.signal ? { signal: options.signal } : {};
  return axios
    .post(
      `${options?.apiRoot || ""}/api/place/name`,
      {
        dcids,
        prop: options?.prop,
      },
      requestOptions
    )
    .then((resp) => {
      return resp.data;
    });
}

/**
 * Fetches the place type for the given DCID
 * names
 */
export async function getPlaceType(
  dcid: string,
  apiRoot?: string
): Promise<string> {
  if (!dcid) {
    return THING_PLACE_TYPE;
  }
  try {
    const response = await axios.get(`${apiRoot || ""}/api/place/type/${dcid}`);
    return response.data;
  } catch (e) {
    return THING_PLACE_TYPE;
  }
}

/**
 * Given a list of place dcids, returns a promise with a map of dcids to place
 * display names (display names are different from place names because they
 * will have the state code at the end of the name if state code is available)
 */
export function getPlaceDisplayNames(
  dcids: string[],
  options?: {
    apiRoot?: string;
    signal?: AbortSignal;
    locale?: string;
  }
): Promise<DisplayNameApiResponse> {
  if (!dcids.length) {
    return Promise.resolve({});
  }
  const requestOptions = options?.signal ? { signal: options.signal } : {};
  let url = `${options?.apiRoot || ""}/api/place/displayname`;
  if (options?.locale) {
    url += `?hl=${options.locale}`;
  }
  return axios
    .post(url, { dcids }, requestOptions)
    .then((resp) => {
      return resp.data;
    })
    .catch(() => {
      return {};
    });
}

/**
 * Given a list of autocomplete placeIds, returns a promise with a map of those
 * placeIds to dcids
 */
export function getPlaceDcids(
  placeIds: string[]
): Promise<Record<string, string>> {
  if (!placeIds.length) {
    return Promise.resolve({});
  }
  const param = placeIds.map((placeId) => "placeIds=" + placeId).join("&");
  return axios
    .get(`/api/place/placeid2dcid?${param}`)
    .then((resp) => resp.data);
}

/**
 * Given a place name returns a promise with its autocomplete placeId.
 */
function getPlaceId(query): Promise<[string, string]> {
  const request = {
    query,
    fields: ["place_id", "name", "types"],
  };
  return new Promise((resolve, reject) => {
    ps.findPlaceFromQuery(request, (results, status) => {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        resolve([query, results[0].place_id]);
      } else {
        reject(status);
      }
    });
  });
}

/**
 * Given a list of place names, returns a promise with a map of those
 * names to placeIds
 */
export function getPlaceIdsFromNames(
  names: string[]
): Promise<Record<string, string>> {
  if (ps === undefined) {
    ps = new google.maps.places.PlacesService(document.createElement("div"));
  }
  return Promise.all(names.map(getPlaceId)).then((places) => {
    const result = {};
    for (const [name, placeId] of places) {
      result[name] = placeId;
    }
    return result;
  });
}
