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

import { ThemeProvider } from "@emotion/react";
import axios from "axios";
import _ from "lodash";
import queryString from "query-string";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { RawIntlProvider } from "react-intl";
import { Container } from "reactstrap";

import { Spinner } from "../../components/spinner";
import {
  CLIENT_TYPES,
  DEFAULT_TOPIC,
  URL_DELIM,
  URL_HASH_PARAMS,
} from "../../constants/app/explore_constants";
import { intl, localizeLink } from "../../i18n/i18n";
import { messages } from "../../i18n/i18n_messages";
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
import { useQueryStore } from "../../shared/stores/query_store_hook";
import theme from "../../theme/theme";
import { QueryResult, UserMessageInfo } from "../../types/app/explore_types";
import { FacetMetadata } from "../../types/facet_metadata";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { defaultDataCommonsWebClient } from "../../utils/data_commons_client";
import { shouldSkipPlaceOverview } from "../../utils/explore_utils";
import {
  extractUrlHashParams,
  getSingleParam,
  getUpdatedHash,
  UrlHashParams,
} from "../../utils/url_utils";
import { AutoPlay } from "./autoplay";
import { ErrorResult } from "./error_result";
import { SuccessResult } from "./success_result";

enum LoadingStatus {
  LOADING = "loading",
  FAILED = "failed",
  SUCCESS = "success",
  DEMO_INIT = "demoInit",
}

const DEFAULT_PLACE = "geoId/06";

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

interface AppProps {
  //true if the app is in demo mode
  isDemo: boolean;
  //if true, there is no header bar search, and so we display search inline
  //if false, there is a header bar search, and so we do not display search inline
  hideHeaderSearchBar: boolean;
}

/**
 * Application container
 */
export function App(props: AppProps): ReactElement {
  const [loadingStatus, setLoadingStatus] = useState<string>(
    props.isDemo ? LoadingStatus.DEMO_INIT : LoadingStatus.LOADING
  );
  const [query, setQuery] = useState<string>("");
  const [pageMetadata, setPageMetadata] = useState<SubjectPageMetadata>(null);
  const [highlightPageMetadata, setHighlightPageMetadata] =
    useState<SubjectPageMetadata>(null);
  const [highlightFacet, setHighlightFacet] = useState<FacetMetadata>(null);
  const [userMessage, setUserMessage] = useState<UserMessageInfo>(null);
  const [debugData, setDebugData] = useState<any>({});
  const [queryResult, setQueryResult] = useState<QueryResult>(null);
  const savedContext = useRef([]);
  const autoPlayQueryList = useRef(getAutoPlayQueries());
  const [autoPlayQuery, setAutoPlayQuery] = useState("");

  const {
    setQueryString: setStoreQueryString,
    setQueryResult: setStoreQueryResult,
    setDebugData: setStoreDebugData,
  } = useQueryStore();

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
    <ThemeProvider theme={theme}>
      <RawIntlProvider value={intl}>
        <Container className="explore-container">
          {props.isDemo && (
            <AutoPlay
              autoPlayQuery={autoPlayQuery}
              inputQuery={(query): void => {
                setQuery(query);
                setStoreQueryString(query);
              }}
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
              hideHeaderSearchBar={props.hideHeaderSearchBar}
            />
          )}
          {loadingStatus === LoadingStatus.LOADING && (
            <div>
              <Spinner isOpen={true} />
            </div>
          )}
          {loadingStatus === LoadingStatus.SUCCESS && (
            <SuccessResult
              query={query}
              debugData={debugData}
              exploreContext={exploreContext}
              queryResult={queryResult}
              pageMetadata={pageMetadata}
              highlightPageMetadata={highlightPageMetadata}
              highlightFacet={highlightFacet}
              userMessage={userMessage}
              hideHeaderSearchBar={props.hideHeaderSearchBar}
            />
          )}
        </Container>
      </RawIntlProvider>
    </ThemeProvider>
  );

  function isFulfillDataValid(fulfillData: any): boolean {
    if (!fulfillData) {
      return false;
    }
    const hasPlace = fulfillData["place"] && fulfillData["place"]["dcid"];
    // Fulfill data needs to have either a place or entities
    return hasPlace || fulfillData["entities"];
  }

  /* eslint-disable */
  function extractMainPlaceAndMetadata(
    fulfillData: any
  ): [any, SubjectPageMetadata] {
    /* eslint-enable */
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
    return [mainPlace, pageMetadata];
  }

  /**
   * Process the fulfill data from the search API response.
   *
   * This processes the fulfill data by setting up page metadata, debug data, and user
   * messages for rendering the explore page. However, if the fulfill response only
   * contains place information, a page overview configuration, but no charts, it will
   * redirect to /place/{placeDcid} instead.
   *
   * @param fulfillData The fulfill data from the search API response
   * @param userQuery The user's search query
   */
  function processFulfillData(
    /* eslint-disable-next-line */
    fulfillData: any,
    setPageConfig: (config: SubjectPageMetadata) => void,
    userQuery?: string,
    isHighlight?: boolean
  ): void {
    setDebugData(fulfillData["debug"]);
    setStoreDebugData(fulfillData["debug"]);
    const userMessage = {
      msgList: fulfillData["userMessages"] || [],
      showForm: !!fulfillData["showForm"],
    };
    if (!isFulfillDataValid(fulfillData)) {
      setUserMessage(userMessage);
      setLoadingStatus(LoadingStatus.FAILED);
      return;
    }
    const [mainPlace, pageMetadata] = extractMainPlaceAndMetadata(fulfillData);
    let isPendingRedirect = false;
    if (
      !isHighlight &&
      pageMetadata &&
      pageMetadata.pageConfig &&
      pageMetadata.pageConfig.categories
    ) {
      isPendingRedirect = shouldSkipPlaceOverview(pageMetadata);
      if (isPendingRedirect) {
        const placeDcid = pageMetadata.place.dcid;
        // If the user has a query, append it to the url
        const url = `/place/${placeDcid}${userQuery ? `?q=${userQuery}` : ""}`;
        // Localize the url to maintain the current page's locale.
        const localizedUrl = localizeLink(url);
        window.location.replace(localizedUrl);
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
        !userQuery &&
        !_.isEmpty(pageMetadata.mainTopics) &&
        pageMetadata.places.length > 0
      ) {
        // If there are multiple places, join them with commas and "and".
        const placeNames = pageMetadata.places?.map((place) => place.name);
        console.log("placeNames", placeNames);
        const inPlaces =
          placeNames?.length > 1
            ? intl.formatMessage(messages.inPlacesAndLastPlace, {
                places: placeNames.slice(0, -1).join(", "),
                lastPlace: placeNames[placeNames.length - 1] || "",
              })
            : intl.formatMessage(messages.inPlace, {
                place: placeNames[0] || "",
              });
        if (
          pageMetadata.mainTopics.length == 2 &&
          pageMetadata.mainTopics[0].name &&
          pageMetadata.mainTopics[1].name
        ) {
          const q = `${pageMetadata.mainTopics[0].name} vs. ${pageMetadata.mainTopics[1].name} ${inPlaces}`;
          setQuery(q);
          setStoreQueryString(q);
        } else if (pageMetadata.mainTopics[0].name) {
          const q = `${pageMetadata.mainTopics[0].name} ${inPlaces}`;
          setQuery(q);
          setStoreQueryString(q);
        }
      }
    }
    savedContext.current = fulfillData["context"] || [];
    setPageConfig(pageMetadata);
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
    setStoreQueryResult(queryResult);
    setLoadingStatus(
      isPendingRedirect ? LoadingStatus.LOADING : LoadingStatus.SUCCESS
    );
  }

  async function handleHashChange(): Promise<void> {
    setLoadingStatus(LoadingStatus.LOADING);
    const hashParams = queryString.parse(window.location.hash);
    let client = getSingleParam(hashParams[URL_HASH_PARAMS.CLIENT]);
    const urlHashParams: UrlHashParams = extractUrlHashParams(hashParams);
    const query = urlHashParams.query;

    let topicsToUse = toApiList(urlHashParams.topic || DEFAULT_TOPIC);
    setHighlightFacet(urlHashParams.facetMetadata);

    let places = [];
    if (!urlHashParams.place) {
      places = [DEFAULT_PLACE];
    } else if (urlHashParams.place.includes(URL_DELIM)) {
      places = toApiList(urlHashParams.place);
    } else {
      places = [urlHashParams.place];
    }

    let fulfillmentPromise: Promise<unknown>;
    let highlightPromise: Promise<unknown>;

    const gaTitle = query
      ? `Q: ${query} - `
      : topicsToUse
      ? `T: ${topicsToUse} | P: ${places} - `
      : "";
    /* eslint-disable camelcase */
    triggerGAEvent(GA_EVENT_PAGE_VIEW, {
      page_title: `${gaTitle}${document.title}`,
      page_location: window.location.href.replace("#", "?"),
    });
    /* eslint-enable camelcase */
    if (query) {
      client = client || CLIENT_TYPES.QUERY;
      setQuery(query);
      setStoreQueryString(query);
      fulfillmentPromise = fetchDetectAndFufillData(
        query,
        savedContext.current,
        urlHashParams.dc,
        urlHashParams.idx,
        urlHashParams.disableExploreMore,
        urlHashParams.detector,
        urlHashParams.testMode,
        urlHashParams.i18n,
        client,
        urlHashParams.defaultPlace,
        urlHashParams.mode,
        urlHashParams.reranker,
        urlHashParams.includeStopWords,
        urlHashParams.maxTopics,
        urlHashParams.maxTopicSvs,
        urlHashParams.maxCharts
      )
        .then((resp) => {
          processFulfillData(resp, setPageMetadata, query);
        })
        .catch(() => {
          setLoadingStatus(LoadingStatus.FAILED);
        });
    } else {
      client = client || CLIENT_TYPES.ENTITY;
      setQuery("");
      setStoreQueryString("");

      let data = {};
      if (urlHashParams.statVars) {
        let statVars = [];
        if (urlHashParams.statVars.includes(URL_DELIM)) {
          statVars = toApiList(urlHashParams.statVars);
        } else {
          statVars = [urlHashParams.statVars];
        }

        data = await defaultDataCommonsWebClient.getNodePropvalsIn({
          dcids: statVars,
          prop: "relevantVariable",
        });

        const allTopics = [];
        for (const sv of statVars) {
          if (sv in data) {
            for (const tpc of data[sv]) {
              allTopics.push(tpc["dcid"]);
            }
          }
        }
        topicsToUse = allTopics;

        highlightPromise = fetchFulfillData(
          places,
          statVars,
          urlHashParams.dc,
          urlHashParams.disableExploreMore,
          urlHashParams.testMode,
          urlHashParams.i18n,
          client,
          urlHashParams.chartType,
          true // Skip related things
        );
      }
      // Merge this with response above. Make calls in parallel
      fulfillmentPromise = fetchFulfillData(
        places,
        topicsToUse,
        urlHashParams.dc,
        urlHashParams.disableExploreMore,
        urlHashParams.testMode,
        urlHashParams.i18n,
        client,
        null
      );

      Promise.all([highlightPromise, fulfillmentPromise]).then(
        ([highlightResponse, fulfillResponse]) => {
          processFulfillData(fulfillResponse, setPageMetadata, undefined);
          processFulfillData(
            highlightResponse,
            setHighlightPageMetadata,
            undefined,
            true
          );
        }
      );
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
  dc: string,
  disableExploreMore: string,
  testMode: string,
  i18n: string,
  client: string,
  chartType: string,
  skipRelatedThings = false
): Promise<unknown> => {
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
    if (chartType) {
      argsMap.set(URL_HASH_PARAMS.CHART_TYPE, chartType);
    }
    const args = argsMap.size > 0 ? `?${generateArgsParams(argsMap)}` : "";
    const startTime = window.performance ? window.performance.now() : undefined;
    const resp = await axios.post(`/api/explore/fulfill${args}`, {
      dc,
      entities: places,
      variables: topics,
      disableExploreMore,
      skipRelatedThings,
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
  includeStopWords: string,
  maxTopics: string,
  maxTopicSvs: string,
  maxCharts: string
): Promise<unknown> => {
  const fieldsMap = {
    [URL_HASH_PARAMS.DETECTOR]: detector,
    [URL_HASH_PARAMS.TEST_MODE]: testMode,
    [URL_HASH_PARAMS.I18N]: i18n,
    [URL_HASH_PARAMS.CLIENT]: client,
    [URL_HASH_PARAMS.DEFAULT_PLACE]: defaultPlace,
    [URL_HASH_PARAMS.MODE]: mode,
    [URL_HASH_PARAMS.RERANKER]: reranker,
    [URL_HASH_PARAMS.INCLUDE_STOP_WORDS]: includeStopWords,
    [URL_HASH_PARAMS.IDX]: idx,
    [URL_HASH_PARAMS.MAX_TOPICS]: maxTopics,
    [URL_HASH_PARAMS.MAX_TOPIC_SVS]: maxTopicSvs,
    [URL_HASH_PARAMS.MAX_CHARTS]: maxCharts,
  };
  const argsMap = new Map<string, string>();
  for (const [field, value] of Object.entries(fieldsMap)) {
    if (value) {
      argsMap.set(field, value);
    }
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
