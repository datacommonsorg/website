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

/**
 * Application state management.
 *
 * Documentation: https://easy-peasy.vercel.app/
 */

import axios from "axios";
import {
  Action,
  action,
  createStore,
  createTypedHooks,
  Thunk,
  thunk,
} from "easy-peasy";
import _ from "lodash";
import Papa from "papaparse";

import {
  NL_DETECTOR_VALS,
  NL_INDEX_VALS,
  NL_PLACE_DETECTOR_VALS,
  NL_URL_PARAMS,
} from "../../constants/app/nl_interface_constants";
import { SearchResult } from "../../types/app/nl_interface_types";
import { stringifyFn } from "../../utils/axios";
import { getUrlToken, getUrlTokenOrDefault } from "../../utils/url_utils";

/**
 * Sample NL query
 */
export interface SampleQuery {
  topic: string;
  query: string;
  // "Works as intended"
  wai: boolean;
}

export interface NLQueryType {
  chartData?: SearchResult;
  context?: any; // Summarized context
  debugData?: any;
  errorMsg?: any;
  feedbackGiven?: boolean;
  id: string;
  isLoading: boolean;
  nlQueryContextId: string;
  nlQueryIdHistory: string[];
  query: string; // Query text
  response?: any; // Response from NL API
  timestamp: number; // Query epoch time in ms
  took?: number; // Query response time in ms
}

export interface NLQueryContextType {
  id: string;
  name: string;
  nlQueryIds: string[];
}

interface NLAppConfig {
  /**
   * Auto play mode option: Automatically run the query; don't wait for the user to hit enter
   * Enable with URL param: "a=True"
   * Default: false
   */
  autoPlayAutoRunQuery: boolean;

  /**
   * Auto play mode option: Wait for the user to hit "enter" in the search box before showing the next query
   * Enable with URL param: "m=True"
   * Default: false
   */
  autoPlayManuallyShowQuery: boolean;

  /**
   * Auto play mode option: Wait this number of ms before showing the next query
   * Example: set with URL param: "qd=1000"
   * Default: 5000 (5 seconds)
   */
  autoPlayAutoShowQueryDelay: number;

  /**
   * Auto play mode internal state: current query index
   */
  autoPlayCurrentQueryIndex: number;

  /**
   * Auto play mode option: Disable the typing animation on auto-play  mode
   * Enable with URL param "d=True"
   * Default: false
   */
  autoPlayDisableTypingAnimation: boolean;

  currentNlQueryContextId: string;

  /**
   * Hides feedback buttons.
   * Enable with URL param "enable_demo=True"
   * Default: false
   */
  hideFeedbackButtons: boolean;

  detector: string;
  indexType: string;
  placeholderQuery: string;
  placeDetector: string;
  topic: string;

  /**
   * Initial queries to auto-play. Configured with "autoPlay*" params above
   * Enable with semicolon-separated list of strings in URL param "q=query1;query2"
   */
  urlPrompts: string[];
}

export interface NLAppModel {
  // Normalized store of NL queries and contexts
  nlQueries: {
    [nlQueryId: string]: NLQueryType;
  };
  nlQueryContexts: {
    [nlQueryContextId: string]: NLQueryContextType;
  };

  // List of query context ids to showon the sidebar
  nlQueryContextIds: string[];
  sampleQueries: SampleQuery[];
  config: NLAppConfig;
}

/**
 * State mutation actions
 */
export interface NLAppActions {
  // Actions (these manipulate state directly)
  addNlQuery: Action<NLAppModel, NLQueryType>;
  addNlQueryContext: Action<NLAppModel, NLQueryContextType>;
  setSampleQueries: Action<NLAppModel, SampleQuery[]>;
  updateConfig: Action<NLAppModel, Partial<NLAppConfig>>;
  updateNlQuery: Action<NLAppModel, Partial<NLQueryType>>;
  updateNlQueryContext: Action<NLAppModel, Partial<NLQueryContextType>>;

  // Thunks (async methods that do not manipulate the state directly)
  initializeAppState: Thunk<NLAppActions>;
  search: Thunk<
    NLAppActions,
    {
      config: NLAppConfig;
      nlQueryContext: NLQueryContextType;
      nlQueryHistory: NLQueryType[];
      query: string;
    }
  >;
}

/**
 * Initial application state
 */
const nlAppModel: NLAppModel = {
  nlQueries: {},
  nlQueryContexts: {},
  nlQueryContextIds: [],
  sampleQueries: [],

  config: {
    autoPlayAutoRunQuery: false,
    autoPlayManuallyShowQuery: false,
    autoPlayAutoShowQueryDelay: 5000,
    autoPlayCurrentQueryIndex: 0,
    autoPlayDisableTypingAnimation: false,
    currentNlQueryContextId: null,
    hideFeedbackButtons: false,
    detector: NL_DETECTOR_VALS.HYBRID,
    indexType: NL_INDEX_VALS.MEDIUM_FT,
    placeholderQuery: "family earnings in california",
    placeDetector: NL_PLACE_DETECTOR_VALS.DC,
    topic: null,
    urlPrompts: [],
  },
};

/**
 * State mutation actions
 */
const nlAppActions: NLAppActions = {
  addNlQuery: action((state, nlQuery) => {
    state.nlQueries[nlQuery.id] = {
      ...nlQuery,
    };
  }),
  addNlQueryContext: action((state, nlQueryContext) => {
    state.nlQueryContexts[nlQueryContext.id] = {
      ...nlQueryContext,
    };
    state.nlQueryContextIds.push(nlQueryContext.id);
  }),
  initializeAppState: thunk(async (actions) => {
    // Try to read indexType from from html
    const htmlIndexType =
      document.getElementById("metadata").dataset.index || "";
    // Fetch URL parameters
    actions.updateConfig({
      autoPlayAutoRunQuery: !!getUrlToken("a"),
      autoPlayManuallyShowQuery: !!getUrlToken("m"),
      autoPlayAutoShowQueryDelay:
        getUrlToken("qd") === null ? 2000 : Number(getUrlToken("qd")),
      autoPlayDisableTypingAnimation: !!getUrlToken("d"),
      hideFeedbackButtons: !!getUrlToken("enable_demo"),
      detector: getUrlTokenOrDefault(
        NL_URL_PARAMS.DETECTOR,
        NL_DETECTOR_VALS.HYBRID
      ),
      indexType:
        htmlIndexType ||
        getUrlTokenOrDefault(NL_URL_PARAMS.IDX, NL_INDEX_VALS.MEDIUM_FT),
      placeDetector: getUrlTokenOrDefault(
        NL_URL_PARAMS.PLACE_DETECTOR,
        NL_PLACE_DETECTOR_VALS.DC
      ),
      topic: getUrlToken("topic"),
      urlPrompts: _.compact((getUrlToken("q") || "").split(";")),
    });

    // Fetch sample queries
    const topicsResponse = await axios.get("/data/nl/topics.csv");
    Papa.parse(topicsResponse.data, {
      complete: (result) => {
        const queries: SampleQuery[] = result["data"].map((item) => ({
          topic: item.category,
          query: item.query,
          wai: (item.wai || "").toLowerCase() === "yes",
        }));
        actions.setSampleQueries(queries);
      },
      header: true,
      worker: true,
    });

    // Todo: load state from local storage here
  }),
  /**
   * Perform an NL query search and update app state with the results
   */
  search: thunk(
    async (actions, { config, nlQueryContext, nlQueryHistory, query }) => {
      let currentNlQueryContext = nlQueryContext;
      // If this query isn't part of an existing context, create a new one.
      if (!nlQueryContext) {
        currentNlQueryContext = {
          id: _.uniqueId("context-"),
          name: query,
          nlQueryIds: [],
        };
        actions.addNlQueryContext(currentNlQueryContext);
        actions.updateConfig({
          currentNlQueryContextId: currentNlQueryContext.id,
        });
      }

      // Initialize NL query state
      const nlQuery: NLQueryType = {
        id: _.uniqueId(`${currentNlQueryContext.id}-query-`),
        isLoading: true,
        nlQueryContextId: currentNlQueryContext.id,
        nlQueryIdHistory: [...currentNlQueryContext.nlQueryIds],
        query,
        timestamp: Date.now(),
      };
      actions.addNlQuery(nlQuery);
      actions.updateNlQueryContext({
        id: currentNlQueryContext.id,
        nlQueryIds: [...currentNlQueryContext.nlQueryIds, nlQuery.id],
      });

      // Search
      const params = {
        q: query,
      };
      if (config.indexType) {
        params["idx"] = config.indexType;
      }
      if (config.detector) {
        params["detector"] = config.detector;
      }
      if (config.placeDetector) {
        params["place_detector"] = config.placeDetector;
      }
      const start = Date.now();
      try {
        const resp = await axios.post(
          "/api/nl/data",
          {
            contextHistory: [...nlQueryHistory]?.pop()?.context,
          },
          {
            params,
            paramsSerializer: stringifyFn,
          }
        );
        const took = Date.now() - start;
        if (
          resp.data["context"] === undefined ||
          resp.data["config"] === undefined
        ) {
          actions.updateNlQuery({
            id: nlQuery.id,
            isLoading: false,
            response: resp,
            took,
            errorMsg: "Sorry, we didn’t understand your question.",
          });
          return;
        }

        const context: any = resp.data["context"];

        const nlQueryUpdate: Partial<NLQueryType> = {
          context,
          id: nlQuery.id,
          took,
        };

        // Filter out empty categories.
        const categories = _.get(resp, ["data", "config", "categories"], []);
        _.remove(categories, (c) => _.isEmpty(c));
        if (categories.length > 0) {
          let mainPlace = {};
          mainPlace = resp.data["place"];
          const fb = resp.data["placeFallback"];
          nlQueryUpdate.chartData = {
            place: {
              dcid: mainPlace["dcid"],
              name: mainPlace["name"],
              types: [mainPlace["place_type"]],
            },
            config: resp.data["config"],
            sessionId:
              !config.hideFeedbackButtons && "session" in resp.data
                ? resp.data["session"]["id"]
                : "",
            svSource: resp.data["svSource"],
            placeSource: resp.data["placeSource"],
            pastSourceContext: resp.data["pastSourceContext"],
            placeFallback:
              "origStr" in fb && "newStr" in fb
                ? {
                    origStr: fb["origStr"],
                    newStr: fb["newStr"],
                  }
                : null,
          };
        } else {
          if ("failure" in resp.data && resp.data["failure"]) {
            nlQueryUpdate.errorMsg = resp.data["failure"];
          } else if ("placeSource" in resp.data && resp.data["placeSource"]) {
            // If there was no place recognized, we might end up with 0
            // categories, provide a different error message.
            nlQueryUpdate.errorMsg =
              "Could not recognize any place in the query!";
          } else {
            nlQueryUpdate.errorMsg = "Sorry, we couldn't answer your question.";
          }
        }
        const debugData = resp.data["debug"];
        if (debugData !== undefined) {
          debugData["context"] = context;
          nlQueryUpdate.debugData = debugData;
        }
        nlQueryUpdate.isLoading = false;
        actions.updateNlQuery(nlQueryUpdate);
        // Update auto play state
        if (
          config.autoPlayCurrentQueryIndex < config.urlPrompts.length &&
          query === config.urlPrompts[config.autoPlayCurrentQueryIndex] &&
          !config.autoPlayManuallyShowQuery
        ) {
          actions.updateConfig({
            autoPlayCurrentQueryIndex: config.autoPlayCurrentQueryIndex + 1,
          });
        }
      } catch (error) {
        console.error("Error fetching data for", query, error);
        actions.updateNlQuery({
          id: nlQuery.id,
          isLoading: false,
          took: Date.now() - start,
          errorMsg: "Sorry, we didn’t understand your question.",
        });
      }
    }
  ),
  setSampleQueries: action((state, sampleQueries) => {
    state.sampleQueries = sampleQueries;
  }),
  updateConfig: action((state, payload) => {
    state.config = {
      ...state.config,
      ...payload,
    };
  }),
  updateNlQuery: action((state, nlQuery) => {
    state.nlQueries[nlQuery.id] = {
      ...state.nlQueries[nlQuery.id],
      ...nlQuery,
    };
  }),
  updateNlQueryContext: action((state, nlQueryContext) => {
    state.nlQueryContexts[nlQueryContext.id] = {
      ...state.nlQueryContexts[nlQueryContext.id],
      ...nlQueryContext,
    };
  }),
};

/**
 * Build store and typed actions
 */
export type NLAppStore = NLAppModel & NLAppActions;
const applicationStore: NLAppStore = {
  ...nlAppModel,
  ...nlAppActions,
};
const store = createStore(applicationStore);
const { useStoreActions, useStoreState, useStoreDispatch, useStore } =
  createTypedHooks<NLAppStore>();
export { store, useStore, useStoreActions, useStoreDispatch, useStoreState };
