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
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getPlaceTypePlural } from "../../utils/string_utils";
import { getUpdatedHash } from "../../utils/url_utils";
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
  const [chartData, setChartData] = useState<SubjectPageMetadata | null>();
  const [userMessage, setUserMessage] = useState<string>("");
  const [debugData, setDebugData] = useState<any>({});
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
        <div>
          <div id="user-message">Sorry, could not complete your request.</div>
          {query && (
            <SearchSection
              query={query}
              debugData={debugData}
              exploreContext={exploreContext}
            />
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
  if (loadingStatus === LoadingStatus.SUCCESS && chartData) {
    const childPlaceType = Object.keys(chartData.childPlaces)[0];
    const placeUrlVal = (
      exploreContext?.entities || [chartData.place.dcid]
    ).join(DELIM);
    const topicUrlVal = (exploreContext?.variables || []).join(DELIM);
    const relatedPlaceTopic = _.isEmpty(chartData.mainTopic)
      ? {
          dcid: exploreContext?.variables,
          name: "",
          types: null,
        }
      : chartData.mainTopic;
    return (
      <Container className="explore-container">
        <div className="row explore-charts">
          <div className="col-12">
            {chartData && chartData.pageConfig && (
              <>
                {exploreContext.dc !== "sdg" && (
                  <SearchSection
                    query={query}
                    debugData={debugData}
                    exploreContext={exploreContext}
                  />
                )}
                <ResultHeaderSection
                  chartData={chartData}
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
                  <NlSessionContext.Provider value={chartData.sessionId}>
                    <ExploreContext.Provider
                      value={{
                        exploreMore: chartData.exploreMore,
                        place: chartData.place.dcid,
                        placeType: exploreContext.childEntityType || "",
                      }}
                    >
                      <SubjectPageMainPane
                        id={PAGE_ID}
                        place={chartData.place}
                        pageConfig={chartData.pageConfig}
                        svgChartHeight={SVG_CHART_HEIGHT}
                        showExploreMore={true}
                      />
                    </ExploreContext.Provider>
                  </NlSessionContext.Provider>
                </RankingUnitUrlFuncContext.Provider>
                {!_.isEmpty(chartData.childPlaces) && (
                  <RelatedPlace
                    relatedPlaces={chartData.childPlaces[childPlaceType]}
                    topic={relatedPlaceTopic}
                    titleSuffix={
                      getPlaceTypePlural(childPlaceType) +
                      " in " +
                      chartData.place.name
                    }
                  ></RelatedPlace>
                )}
                {!_.isEmpty(chartData.peerPlaces) && (
                  <RelatedPlace
                    relatedPlaces={chartData.peerPlaces}
                    topic={relatedPlaceTopic}
                    titleSuffix={
                      "other " + getPlaceTypePlural(chartData.place.types[0])
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

  function useFulfillData(fulfillData: any, shouldSetQuery: boolean): void {
    if (
      !fulfillData ||
      !fulfillData["place"] ||
      !fulfillData["place"]["dcid"]
    ) {
      setLoadingStatus(LoadingStatus.FAILED);
      return;
    }
    const mainPlace = fulfillData["place"];
    const chartData: SubjectPageMetadata = {
      place: {
        dcid: mainPlace["dcid"],
        name: mainPlace["name"],
        types: [mainPlace["place_type"]],
      },
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
    if (chartData && chartData.pageConfig && chartData.pageConfig.categories) {
      // Note: for category links, we only use the main-topic.
      for (const category of chartData.pageConfig.categories) {
        if (category.dcid) {
          category.url = `/explore/#${getUpdatedHash({
            [URL_HASH_PARAMS.TOPIC]: category.dcid,
            [URL_HASH_PARAMS.PLACE]: chartData.place.dcid,
            [URL_HASH_PARAMS.QUERY]: "",
          })}`;
        }
      }
      if (shouldSetQuery && chartData.mainTopic?.name && chartData.place.name) {
        const q = `${chartData.mainTopic.name} in ${chartData.place.name}`;
        setQuery(q);
      }
    }
    savedContext.current = fulfillData["context"] || [];
    setChartData(chartData);
    setUserMessage(fulfillData["userMessage"]);
    setDebugData(fulfillData["debug"]);
    setLoadingStatus(LoadingStatus.SUCCESS);
  }

  function handleHashChange(): void {
    setLoadingStatus(LoadingStatus.LOADING);
    const hashParams = queryString.parse(window.location.hash);
    const query = getSingleParam(hashParams[URL_HASH_PARAMS.QUERY]);
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
          useFulfillData(resp, false);
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
        currentContext.childEntityType,
        currentContext.comparisonEntities || [],
        currentContext.comparisonVariables || [],
        dc,
        currentContext.extensionGroups || [],
        currentContext.classifications || [],
        disableExploreMore,
        nlFulfillment
      )
        .then((resp) => {
          useFulfillData(resp, true);
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
