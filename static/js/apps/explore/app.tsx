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
import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import {
  DEFAULT_TOPIC,
  URL_HASH_PARAMS,
} from "../../constants/app/explore_constants";
import { SVG_CHART_HEIGHT } from "../../constants/app/nl_interface_constants";
import {
  ExploreContext,
  NlSessionContext,
  RankingUnitUrlFuncContext,
} from "../../shared/context";
import { QueryResult } from "../../types/app/nl_interface_types";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getPlaceTypePlural } from "../../utils/string_utils";
import { getUpdatedHash } from "../../utils/url_utils";
import { DebugInfo } from "../nl_interface/debug_info";
import { RelatedPlace } from "./related_place";
import { ResultHeaderSection } from "./result_header_section";
import { SearchSection } from "./search_section";

enum LoadingStatus {
  LOADING = "loading",
  FAILED = "failed",
  SUCCESS = "success",
}

const PAGE_ID = "explore";
const DEFAULT_PLACE = "geoId/06";
const DELIM = "___";

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
  return input.split(DELIM).filter((i) => i);
};

/**
 * Application container
 */
export function App(): JSX.Element {
  const [loadingStatus, setLoadingStatus] = useState<string>(
    LoadingStatus.LOADING
  );
  const [query, setQuery] = useState<string>("");
  const [pageMetadata, setPageMetadata] = useState<SubjectPageMetadata>(null);
  const [userMessage, setUserMessage] = useState<string>("");
  const [debugData, setDebugData] = useState<any>({});
  const [queryResult, setQueryResult] = useState<QueryResult>(null);
  const savedContext = useRef([]);

  useEffect(() => {
    handleHashChange();
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
  if (loadingStatus === LoadingStatus.FAILED) {
    return (
      <Container className="explore-container">
        <div className="row explore-charts">
          <div id="user-message">Sorry, could not complete your request.</div>
          {query && (
            <>
              <SearchSection
                query={query}
                debugData={debugData}
                exploreContext={exploreContext}
              />
              <DebugInfo
                debugData={debugData}
                queryResult={queryResult}
              ></DebugInfo>
            </>
          )}
        </div>
      </Container>
    );
  }
  if (loadingStatus === LoadingStatus.LOADING) {
    return (
      <Container className="explore-container">
        <div>
          <Spinner isOpen={true} />
        </div>
      </Container>
    );
  }
  if (loadingStatus === LoadingStatus.SUCCESS && pageMetadata) {
    const childPlaceType = !_.isEmpty(pageMetadata.childPlaces)
      ? Object.keys(pageMetadata.childPlaces)[0]
      : "";
    const placeUrlVal = (
      exploreContext?.entities || [pageMetadata.place.dcid]
    ).join(DELIM);
    const topicUrlVal = (exploreContext?.variables || []).join(DELIM);
    const relatedPlaceTopic = _.isEmpty(pageMetadata.mainTopic)
      ? {
          dcid: topicUrlVal,
          name: "",
          types: null,
        }
      : pageMetadata.mainTopic;
    return (
      <Container className="explore-container">
        <div className="row explore-charts">
          <div className="col-12">
            <DebugInfo
              debugData={debugData}
              queryResult={queryResult}
            ></DebugInfo>
            {pageMetadata && pageMetadata.pageConfig && (
              <>
                {exploreContext.dc !== "sdg" && (
                  <SearchSection
                    query={query}
                    debugData={debugData}
                    exploreContext={exploreContext}
                  />
                )}
                <ResultHeaderSection
                  pageMetadata={pageMetadata}
                  userMessage={userMessage}
                  placeUrlVal={placeUrlVal}
                />
                <RankingUnitUrlFuncContext.Provider
                  value={(dcid: string) => {
                    return `/explore/#${getUpdatedHash({
                      [URL_HASH_PARAMS.PLACE]: dcid,
                      [URL_HASH_PARAMS.TOPIC]: topicUrlVal,
                      [URL_HASH_PARAMS.QUERY]: "",
                    })}`;
                  }}
                >
                  <NlSessionContext.Provider value={pageMetadata.sessionId}>
                    <ExploreContext.Provider
                      value={{
                        exploreMore: pageMetadata.exploreMore,
                        place: pageMetadata.place.dcid,
                        placeType: exploreContext.childEntityType || "",
                      }}
                    >
                      <SubjectPageMainPane
                        id={PAGE_ID}
                        place={pageMetadata.place}
                        pageConfig={pageMetadata.pageConfig}
                        svgChartHeight={SVG_CHART_HEIGHT}
                        showExploreMore={true}
                      />
                    </ExploreContext.Provider>
                  </NlSessionContext.Provider>
                </RankingUnitUrlFuncContext.Provider>
                {!_.isEmpty(pageMetadata.childPlaces) && (
                  <RelatedPlace
                    relatedPlaces={pageMetadata.childPlaces[childPlaceType]}
                    topic={relatedPlaceTopic}
                    titleSuffix={
                      getPlaceTypePlural(childPlaceType) +
                      " in " +
                      pageMetadata.place.name
                    }
                  ></RelatedPlace>
                )}
                {!_.isEmpty(pageMetadata.peerPlaces) && (
                  <RelatedPlace
                    relatedPlaces={pageMetadata.peerPlaces}
                    topic={relatedPlaceTopic}
                    titleSuffix={
                      "other " + getPlaceTypePlural(pageMetadata.place.types[0])
                    }
                  ></RelatedPlace>
                )}
              </>
            )}
          </div>
        </div>
      </Container>
    );
  }
  return <Container className="explore-container"></Container>;

  function processFulfillData(fulfillData: any, shouldSetQuery: boolean): void {
    setDebugData(fulfillData["debug"]);
    if (
      !fulfillData ||
      !fulfillData["place"] ||
      !fulfillData["place"]["dcid"]
    ) {
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
      pageConfig: fulfillData["config"],
      childPlaces: fulfillData["relatedThings"]["childPlaces"],
      peerPlaces: fulfillData["relatedThings"]["peerPlaces"],
      parentPlaces: fulfillData["relatedThings"]["parentPlaces"],
      parentTopics: fulfillData["relatedThings"]["parentTopics"],
      childTopics: fulfillData["relatedThings"]["childTopics"],
      peerTopics: fulfillData["relatedThings"]["peerTopics"],
      exploreMore: fulfillData["relatedThings"]["exploreMore"],
      mainTopic: fulfillData["relatedThings"]["mainTopic"],
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
        pageMetadata.mainTopic?.name &&
        pageMetadata.place.name
      ) {
        const q = `${pageMetadata.mainTopic.name} in ${pageMetadata.place.name}`;
        setQuery(q);
      }
    }
    console.log(fulfillData);
    savedContext.current = fulfillData["context"] || [];
    setPageMetadata(pageMetadata);
    setUserMessage(fulfillData["userMessage"]);
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
    const nlFulfillment = getSingleParam(
      hashParams[URL_HASH_PARAMS.NL_FULFILLMENT]
    );
    if (query) {
      setQuery(query);
      fetchDetectAndFufillData(
        query,
        savedContext.current,
        dc,
        disableExploreMore,
        nlFulfillment
      )
        .then((resp) => {
          processFulfillData(resp, false);
        })
        .catch(() => {
          setLoadingStatus(LoadingStatus.FAILED);
        });
    } else {
      setQuery("");
      const currentContext = !_.isEmpty(savedContext.current)
        ? savedContext.current[0].insightCtx
        : {};
      fetchFulfillData(
        toApiList(place || DEFAULT_PLACE),
        toApiList(topic || DEFAULT_TOPIC),
        "",
        currentContext.comparisonEntities || [],
        currentContext.comparisonVariables || [],
        dc,
        currentContext.extensionGroups || [],
        currentContext.classifications || [],
        disableExploreMore,
        nlFulfillment
      )
        .then((resp) => {
          processFulfillData(resp, true);
        })
        .catch(() => {
          setLoadingStatus(LoadingStatus.FAILED);
        });
    }
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
  nlFulfillment: string
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
      nlFulfillment: nlFulfillment === "0" ? false : true,
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
  disableExploreMore: string,
  nlFulfillment: string
) => {
  try {
    const resp = await axios.post(
      `/api/explore/detect-and-fulfill?q=${query}`,
      {
        contextHistory: savedContext,
        dc,
        disableExploreMore,
        nlFulfillment: nlFulfillment === "0" ? false : true,
      }
    );
    return resp.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};
