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
import { Container } from "reactstrap";

import { Spinner } from "../../components/spinner";
import {
  DEFAULT_TOPIC,
  URL_DELIM,
  URL_HASH_PARAMS,
} from "../../constants/app/explore_constants";
import {
  QueryResult,
  UserMessageInfo,
} from "../../types/app/nl_interface_types";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getUpdatedHash } from "../../utils/url_utils";
import { AutoPlay } from "./autoplay";
import { ErrorResult } from "./error_result";
import { SearchSection } from "./search_section";
import { SuccessResult } from "./success_result";
import { GA_EVENT_PAGE_VIEW, triggerGAEvent } from "../../shared/ga_events";

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
          <SearchSection query={query} debugData={null} exploreContext={null} />
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
  );

  function processFulfillData(fulfillData: any, shouldSetQuery: boolean): void {
    setDebugData(fulfillData["debug"]);
    if (
      !fulfillData ||
      !fulfillData["place"] ||
      !fulfillData["place"]["dcid"]
    ) {
      setUserMessage(fulfillData["userMessage"]);
      setLoadingStatus(LoadingStatus.FAILED);
      return;
    }
    const mainPlace = {
      dcid: fulfillData["place"]["dcid"],
      name: fulfillData["place"]["name"],
      types: [fulfillData["place"]["place_type"]],
    };
    const pageMetadata: SubjectPageMetadata = {
      place: mainPlace,
      places: fulfillData["places"],
      pageConfig: fulfillData["config"],
      childPlaces: fulfillData["relatedThings"]["childPlaces"],
      peerPlaces: fulfillData["relatedThings"]["peerPlaces"],
      parentPlaces: fulfillData["relatedThings"]["parentPlaces"],
      parentTopics: fulfillData["relatedThings"]["parentTopics"],
      childTopics: fulfillData["relatedThings"]["childTopics"],
      peerTopics: fulfillData["relatedThings"]["peerTopics"],
      exploreMore: fulfillData["relatedThings"]["exploreMore"],
      mainTopics: fulfillData["relatedThings"]["mainTopics"],
      sessionId: "session" in fulfillData ? fulfillData["session"]["id"] : "",
    };
    if (
      pageMetadata &&
      pageMetadata.pageConfig &&
      pageMetadata.pageConfig.categories
    ) {
      // Note: for category links, we only use the main-topic.
      for (const category of pageMetadata.pageConfig.categories) {
        if (category.dcid) {
          category.url = `/explore/#${getUpdatedHash({
            [URL_HASH_PARAMS.TOPIC]: category.dcid,
            [URL_HASH_PARAMS.PLACE]: pageMetadata.place.dcid,
            [URL_HASH_PARAMS.QUERY]: "",
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
        } else if (pageMetadata.mainTopics[0].name) {
          const q = `${pageMetadata.mainTopics[0].name} in ${pageMetadata.place.name}`;
          setQuery(q);
        }
      }
    }
    const userMessage = {
      msg: fulfillData["userMessage"] || "",
      showForm: !!fulfillData["showForm"],
    };
    savedContext.current = fulfillData["context"] || [];
    setPageMetadata(pageMetadata);
    setUserMessage(userMessage);
    setLoadingStatus(LoadingStatus.SUCCESS);
    setQueryResult({
      place: mainPlace,
      config: pageMetadata.pageConfig,
      svSource: fulfillData["svSource"],
      placeSource: fulfillData["placeSource"],
      placeFallback: fulfillData["placeFallback"],
      pastSourceContext: fulfillData["pastSourceContext"],
      sessionId: pageMetadata.sessionId,
    });
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
    const disableExploreMore = getSingleParam(
      hashParams[URL_HASH_PARAMS.DISABLE_EXPLORE_MORE]
    );
    let fulfillmentPromise: Promise<any>;
    triggerGAEvent(GA_EVENT_PAGE_VIEW, {
      page_title: document.title,
      page_location: window.location.href
    });
    if (query) {
      setQuery(query);
      fulfillmentPromise = fetchDetectAndFufillData(
        query,
        savedContext.current,
        dc,
        disableExploreMore
      )
        .then((resp) => {
          processFulfillData(resp, false);
        })
        .catch(() => {
          setLoadingStatus(LoadingStatus.FAILED);
        });
    } else {
      setQuery("");
      fulfillmentPromise = fetchFulfillData(
        toApiList(place || DEFAULT_PLACE),
        toApiList(topic || DEFAULT_TOPIC),
        "",
        [],
        [],
        dc,
        [],
        [],
        disableExploreMore
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
  disableExploreMore: string
) => {
  try {
    const resp = await axios.post(`/api/explore/fulfill`, {
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
  disableExploreMore: string
) => {
  try {
    const resp = await axios.post(
      `/api/explore/detect-and-fulfill?q=${query}`,
      {
        contextHistory: savedContext,
        dc,
        disableExploreMore,
      }
    );
    return resp.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};
