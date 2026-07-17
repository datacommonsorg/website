/**
 * Copyright 2026 Google LLC
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
 * Global app context for download tool.
 */

import React, { createContext, useRef, useState } from "react";

import { FacetSelectorFacetInfo } from "../../shared/facet_selector/facet_selector";
import { StatVarInfo } from "../../shared/stat_var";
import { NamedTypedPlace } from "../../shared/types";

export const DATE_ALL = "";

export const URL_PARAM_KEYS = {
  PLACE: "place",
  PLACE_TYPE: "pt",
  STAT_VARS: "sv",
  FACET_MAP: "facets",
};
export const SEPARATOR = "__";

export interface DownloadOptions {
  selectedPlace: NamedTypedPlace;
  enclosedPlaceType: string;
  selectedStatVars: Record<string, StatVarInfo>;
  selectedFacets: Record<string, string>;
}

export interface OptionsWrapper {
  value: DownloadOptions;
  set: React.Dispatch<React.SetStateAction<DownloadOptions>>;
}

export interface FacetStateWrapper {
  list: FacetSelectorFacetInfo[] | null;
  setList: React.Dispatch<
    React.SetStateAction<FacetSelectorFacetInfo[] | null>
  >;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: boolean;
  setError: React.Dispatch<React.SetStateAction<boolean>>;
  reqObj: React.MutableRefObject<Record<string, unknown>>;
}

export interface ContextType {
  options: OptionsWrapper;
  facets: FacetStateWrapper;
}

export const Context = createContext({} as ContextType);

export function useInitialContext(): ContextType {
  const [selectedOptions, setSelectedOptions] = useState<DownloadOptions>(null);
  const [facetList, setFacetList] = useState<FacetSelectorFacetInfo[] | null>(
    null
  );
  const [facetLoading, setFacetLoading] = useState(false);
  const [facetError, setFacetError] = useState(false);
  const facetsReqObj = useRef({});

  return {
    options: {
      value: selectedOptions,
      set: setSelectedOptions,
    },
    facets: {
      list: facetList,
      setList: setFacetList,
      loading: facetLoading,
      setLoading: setFacetLoading,
      error: facetError,
      setError: setFacetError,
      reqObj: facetsReqObj,
    },
  };
}
