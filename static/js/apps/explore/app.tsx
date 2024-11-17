/**
 * Copyright 2023 Google LLC
 *
 * Licensed under he Apache License, Version 2.0 (the "License");
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
 * Main component for DC Explore.
 */

import axios from "axios";
import _ from "lodash";
import queryString from "query-string";
import React, { useEffect, useRef, useState } from "react";
import { RawIntlProvider } from "react-intl";
import { Container } from "reactstrap";

import { Spinner } from "../../components/spinner";
import {
  CLIENT_TYPES,
  DEFAULT_TOPIC,
  URL_DELIM,
  URL_HASH_PARAMS,
} from "../../constants/app/explore_constants";
import { intl } from "../../i18n/i18n";
import {
  GA_EVENT_NL_DETECT_FULFILL,
  GA_EVENT_NL_FULFILL,
  GA_EVENT_PAGE_VIEW,
  GA_PARAM_PLACE,
  GA_PARAM_QUERY,
  GA_PARAM_TIMING_MS,
  GA_PARAM_TOPIC,
  triggerGAEvent,
} from "../../shared/ga_events";
import { QueryResult, UserMessageInfo } from "../../types/app/explore_types";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { shouldSkipPlaceOverview } from "../../utils/explore_utils";
import { getUpdatedHash } from "../../utils/url_utils";
import { AutoPlay } from "./autoplay";
import { ErrorResult } from "./error_result";
import { SearchSection } from "./search_section";
import { SuccessResult } from "./success_result";

enum LoadingStatus {
  LOADING = "loading",
  FAILED = "failed",
  SUCCESS = "success",
  DEMO_INIT = "demoInit",
}

const DEFAULT_PLACE = "geoId/06";

const getSingleParam = (input: string | string[]): string => {
  // If the input is an array, convert it to a single string
  if (Array.isArray(input)) {
    return input[0];
  }
  if (!input) {
    // Return empty instead of letting it be undefined.
    return "";
  }
  return input;
};

const toApiList = (input: string): string[] => {
  // Split of an empty string returns [''].  Trim empties.
  return input.split(URL_DELIM).filter((i) => i);
};

// Gets the list of auto play queries in the url.
function getAutoPlayQueries(): string[] {
  const hashParams = queryString.parse(window.location.hash);
  const queryListParam = getSingleParam(
    hashParams[URL_HASH_PARAMS.AUTO_PLAY_QUERY]
  );
  return toApiList(queryListParam);
}

/**
 * Application container
 */
export function App(props: { isDemo: boolean }): JSX.Element {
  const [loadingStatus, setLoadingStatus] = useState<string>(
    props.isDemo ? LoadingStatus.DEMO_INIT : LoadingStatus.LOADING
  );
  const [query, setQuery] = useState<string>("");
  const [pageMetadata, setPageMetadata] = useState<SubjectPageMetadata>(null);
  const [userMessage, setUserMessage] = useState<UserMessageInfo>(null);
  const [debugData, setDebugData] = useState<any>({});
  const [queryResult, setQueryResult] = useState<QueryResult>(null);
  const savedContext = useRef([]);
  const autoPlayQueryList = useRef(getAutoPlayQueries());
  const [autoPlayQuery, setAutoPlayQuery] = useState("");

  useEffect(() => {
    // If in demo mode, should input first autoplay query on mount.
    // Otherwise, treat it as a regular hashchange.
    if (props.isDemo && autoPlayQueryList.current.length > 0) {
      setAutoPlayQuery(autoPlayQueryList.current.shift());
    } else {
      handleHashChange();
    }
    // Listen to the 'hashchange' event and call the handler
    window.addEventListener("hashchange", handleHashChange);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const exploreContext = _.isEmpty(savedContext.current)
    ? null
    : savedContext.current[0]["insightCtx"];
  return (
    <RawIntlProvider value={intl}>
      <Container className="explore-container">
        {props.isDemo && (
          <AutoPlay
            autoPlayQuery={autoPlayQuery}
            inputQuery={setQuery}
            disableDelay={loadingStatus === LoadingStatus.DEMO_INIT}
          />
        )}
        {loadingStatus === LoadingStatus.FAILED && (
          <ErrorResult
            query={query}
            debugData={debugData}
            exploreContext={exploreContext}
            queryResult={queryResult}
            userMessage={userMessage}
          />
        )}
        {loadingStatus === LoadingStatus.LOADING && (
          <div>
            <Spinner isOpen={true} />
          </div>
        )}
        {loadingStatus === LoadingStatus.DEMO_INIT && (
          <div className="row explore-charts">
            <SearchSection
              query={query}
              debugData={null}
              exploreContext={null}
            />
          </div>
        )}
        {loadingStatus === LoadingStatus.SUCCESS && (
          <SuccessResult
            query={query}
            debugData={debugData}
            exploreContext={exploreContext}
            queryResult={queryResult}
            pageMetadata={pageMetadata}
            userMessage={userMessage}
          />
        )}
      </Container>
    </RawIntlProvider>
  );

  function isFulfillDataValid(fulfillData: any): boolean {
    if (!fulfillData) {
      return false;
    }
    const hasPlace = fulfillData["place"] && fulfillData["place"]["dcid"];
    // Fulfill data needs to have either a place or entities
    return hasPlace || fulfillData["entities"];
  }

  function processFulfillData(fulfillData: any, shouldSetQuery: boolean): void {
    setDebugData(fulfillData["debug"]);
    globalThis.headerStore.setDebugObject(fulfillData["debug"]);
    const userMessage = {
      msgList: fulfillData["userMessages"] || [],
      showForm: !!fulfillData["showForm"],
    };
    if (!isFulfillDataValid) {
      setUserMessage(userMessage);
      setLoadingStatus(LoadingStatus.FAILED);
      return;
    }
    const mainPlace = {
      dcid: fulfillData["place"]["dcid"],
      name: fulfillData["place"]["name"],
      types: [fulfillData["place"]["place_type"]],
    };
    const relatedThings = fulfillData["relatedThings"] || {};
    const pageMetadata: SubjectPageMetadata = {
      place: mainPlace,
      places: fulfillData["places"],
      pageConfig: fulfillData["config"],
      childPlaces: relatedThings["childPlaces"],
      peerPlaces: relatedThings["peerPlaces"],
      parentPlaces: relatedThings["parentPlaces"],
      parentTopics: relatedThings["parentTopics"],
      childTopics: relatedThings["childTopics"],
      peerTopics: relatedThings["peerTopics"],
      exploreMore: relatedThings["exploreMore"],
      mainTopics: relatedThings["mainTopics"],
      sessionId: "session" in fulfillData ? fulfillData["session"]["id"] : "",
      svSource: fulfillData["svSource"],
    };
    let isPendingRedirect = false;
    if (
      pageMetadata &&
      pageMetadata.pageConfig &&
      pageMetadata.pageConfig.categories
    ) {
      isPendingRedirect = shouldSkipPlaceOverview(pageMetadata);
      if (isPendingRedirect) {
        const placeDcid = pageMetadata.place.dcid;
        const url = `/place/${placeDcid}`;
        window.location.replace(url);
      }
      // Note: for category links, we only use the main-topic.
      for (const category of pageMetadata.pageConfig.categories) {
        if (category.dcid) {
          category.url = `/explore/#${getUpdatedHash({
            [URL_HASH_PARAMS.TOPIC]: category.dcid,
            [URL_HASH_PARAMS.PLACE]: pageMetadata.place.dcid,
            [URL_HASH_PARAMS.QUERY]: "",
            [URL_HASH_PARAMS.CLIENT]: CLIENT_TYPES.RELATED_TOPIC,
          })}`;
        }
      }
      if (
        shouldSetQuery &&
        !_.isEmpty(pageMetadata.mainTopics) &&
        pageMetadata.place.name
      ) {
        if (
          pageMetadata.mainTopics.length == 2 &&
          pageMetadata.mainTopics[0].name &&
          pageMetadata.mainTopics[1].name
        ) {
          const q = `${pageMetadata.mainTopics[0].name} vs. ${pageMetadata.mainTopics[1].name} in ${pageMetadata.place.name}`;
          setQuery(q);
          globalThis.headerStore.setQueryString(q);
        } else if (pageMetadata.mainTopics[0].name) {
          const q = `${pageMetadata.mainTopics[0].name} in ${pageMetadata.place.name}`;
          setQuery(q);
          globalThis.headerStore.setQueryString(q);
        }
      }
    }
    savedContext.current = fulfillData["context"] || [];
    setPageMetadata(pageMetadata);
    setUserMessage(userMessage);
    const queryResult = {
      place: mainPlace,
      config: pageMetadata.pageConfig,
      svSource: fulfillData["svSource"],
      placeSource: fulfillData["placeSource"],
      placeFallback: fulfillData["placeFallback"],
      pastSourceContext: fulfillData["pastSourceContext"],
      sessionId: pageMetadata.sessionId,
    };
    setQueryResult(queryResult);
    globalThis.headerStore.setQueryResult(queryResult);
    setLoadingStatus(
      isPendingRedirect ? LoadingStatus.LOADING : LoadingStatus.SUCCESS
    );
  }

  function handleHashChange(): void {
    setLoadingStatus(LoadingStatus.LOADING);
    const hashParams = queryString.parse(window.location.hash);
    const query =
      getSingleParam(hashParams[URL_HASH_PARAMS.QUERY]) ||
      getSingleParam(hashParams[URL_HASH_PARAMS.DEPRECATED_QUERY]);
    const topic = getSingleParam(hashParams[URL_HASH_PARAMS.TOPIC]);
    const place = getSingleParam(hashParams[URL_HASH_PARAMS.PLACE]);
    const dc = getSingleParam(hashParams[URL_HASH_PARAMS.DC]);
    const idx = getSingleParam(hashParams[URL_HASH_PARAMS.IDX]);
    const disableExploreMore = getSingleParam(
      hashParams[URL_HASH_PARAMS.DISABLE_EXPLORE_MORE]
    );
    const detector = getSingleParam(hashParams[URL_HASH_PARAMS.DETECTOR]);
    const testMode = getSingleParam(hashParams[URL_HASH_PARAMS.TEST_MODE]);
    const i18n = getSingleParam(hashParams[URL_HASH_PARAMS.I18N]);
    const includeStopWords = getSingleParam(
      hashParams[URL_HASH_PARAMS.INCLUDE_STOP_WORDS]
    );
    const defaultPlace = getSingleParam(
      hashParams[URL_HASH_PARAMS.DEFAULT_PLACE]
    );
    const mode = getSingleParam(hashParams[URL_HASH_PARAMS.MODE]);
    let client = getSingleParam(hashParams[URL_HASH_PARAMS.CLIENT]);
    const reranker = getSingleParam(hashParams[URL_HASH_PARAMS.RERANKER]);

    let fulfillmentPromise: Promise<any>;
    const gaTitle = query
      ? `Q: ${query} - `
      : topic
      ? `T: ${topic} | P: ${place} - `
      : "";
    triggerGAEvent(GA_EVENT_PAGE_VIEW, {
      page_title: `${gaTitle}${document.title}`,
      page_location: window.location.href.replace("#", "?"),
    });
    if (query) {
      client = client || CLIENT_TYPES.QUERY;
      setQuery(query);
      globalThis.headerStore.setQueryString(query);
      fulfillmentPromise = fetchDetectAndFufillData(
        query,
        savedContext.current,
        dc,
        idx,
        disableExploreMore,
        detector,
        testMode,
        i18n,
        client,
        defaultPlace,
        mode,
        reranker,
        includeStopWords
      )
        .then((resp) => {
          processFulfillData(resp, false);
        })
        .catch(() => {
          setLoadingStatus(LoadingStatus.FAILED);
        });
    } else {
      client = client || CLIENT_TYPES.ENTITY;
      setQuery("");
      globalThis.headerStore.setQueryString("");
      fulfillmentPromise = fetchFulfillData(
        toApiList(place || DEFAULT_PLACE),
        toApiList(topic || DEFAULT_TOPIC),
        "",
        [],
        [],
        dc,
        [],
        [],
        disableExploreMore,
        testMode,
        i18n,
        client
      )
        .then((resp) => {
          processFulfillData(resp, true);
        })
        .catch(() => {
          setLoadingStatus(LoadingStatus.FAILED);
        });
    }
    // Once current query processing is done, run the next autoplay query if
    // there are any more autoplay queries left.
    fulfillmentPromise.then(() => {
      if (autoPlayQueryList.current.length > 0) {
        setAutoPlayQuery(autoPlayQueryList.current.shift());
      }
    });
  }
}

const fetchFulfillData = async (
  places: string[],
  topics: string[],
  placeType: string,
  cmpPlaces: string[],
  cmpTopics: string[],
  dc: string,
  svgs: string[],
  classificationsJson: any,
  disableExploreMore: string,
  testMode: string,
  i18n: string,
  client: string
) => {
  try {
    const argsMap = new Map<string, string>();
    if (testMode) {
      argsMap.set(URL_HASH_PARAMS.TEST_MODE, testMode);
    }
    if (i18n) {
      argsMap.set(URL_HASH_PARAMS.I18N, i18n);
    }
    if (client) {
      argsMap.set(URL_HASH_PARAMS.CLIENT, client);
    }
    const args = argsMap.size > 0 ? `?${generateArgsParams(argsMap)}` : "";
    const startTime = window.performance ? window.performance.now() : undefined;
    const resp = await axios.post(`/api/explore/fulfill${args}`, {
      dc,
      entities: places,
      variables: topics,
      childEntityType: placeType,
      comparisonEntities: cmpPlaces,
      comparisonVariables: cmpTopics,
      extensionGroups: svgs,
      classifications: classificationsJson,
      disableExploreMore,
    });
    if (startTime) {
      const elapsedTime = window.performance
        ? window.performance.now() - startTime
        : undefined;
      if (elapsedTime) {
        triggerGAEvent(GA_EVENT_NL_FULFILL, {
          [GA_PARAM_TOPIC]: topics,
          [GA_PARAM_PLACE]: places,
          [GA_PARAM_TIMING_MS]: Math.round(elapsedTime).toString(),
        });
      }
    }
    return resp.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const fetchDetectAndFufillData = async (
  query: string,
  savedContext: any,
  dc: string,
  idx: string,
  disableExploreMore: string,
  detector: string,
  testMode: string,
  i18n: string,
  client: string,
  defaultPlace: string,
  mode: string,
  reranker: string,
  includeStopWords: string
) => {
  const argsMap = new Map<string, string>();
  if (detector) {
    argsMap.set(URL_HASH_PARAMS.DETECTOR, detector);
  }
  if (testMode) {
    argsMap.set(URL_HASH_PARAMS.TEST_MODE, testMode);
  }
  if (i18n) {
    argsMap.set(URL_HASH_PARAMS.I18N, i18n);
  }
  if (client) {
    argsMap.set(URL_HASH_PARAMS.CLIENT, client);
  }
  if (defaultPlace) {
    argsMap.set(URL_HASH_PARAMS.DEFAULT_PLACE, defaultPlace);
  }
  if (mode) {
    argsMap.set(URL_HASH_PARAMS.MODE, mode);
  }
  if (reranker) {
    argsMap.set(URL_HASH_PARAMS.RERANKER, reranker);
  }
  if (includeStopWords) {
    argsMap.set(URL_HASH_PARAMS.INCLUDE_STOP_WORDS, includeStopWords);
  }
  if (idx) {
    argsMap.set(URL_HASH_PARAMS.IDX, idx);
  }
  const args = argsMap.size > 0 ? `&${generateArgsParams(argsMap)}` : "";
  try {
    const startTime = window.performance ? window.performance.now() : undefined;
    const resp = await axios.post(
      `/api/explore/detect-and-fulfill?q=${query}${args}`,
      {
        contextHistory: savedContext,
        dc,
        disableExploreMore,
      }
    );
    if (startTime) {
      const elapsedTime = window.performance
        ? window.performance.now() - startTime
        : undefined;
      if (elapsedTime) {
        // TODO(beets): Add past queries from context.
        triggerGAEvent(GA_EVENT_NL_DETECT_FULFILL, {
          [GA_PARAM_QUERY]: query,
          [GA_PARAM_TIMING_MS]: Math.round(elapsedTime).toString(),
        });
      }
    }
    return resp.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const generateArgsParams = (argsMap: Map<string, string>): string => {
  const args: string[] = [];

  argsMap.forEach((value, key) => args.push(`${key}=${value}`));

  return args.join("&");
};
