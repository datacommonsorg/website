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
import queryString, { ParsedQuery } from "query-string";
import React, { useEffect, useRef, useState } from "react";
import { Container } from "reactstrap";

import { Spinner } from "../../components/spinner";
import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { TextSearchBar } from "../../components/text_search_bar";
import { SVG_CHART_HEIGHT } from "../../constants/app/nl_interface_constants";
import {
  ExploreContext,
  NlSessionContext,
  RankingUnitUrlFuncContext,
} from "../../shared/context";
import { NamedTypedNode } from "../../shared/types";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getFeedbackLink } from "../../utils/nl_interface_utils";
import { getPlaceTypePlural } from "../../utils/string_utils";
import { updateHash } from "../../utils/url_utils";
import { Item, ItemList } from "./item_list";
import { RelatedPlace } from "./related_place";

const PAGE_ID = "explore";
const DEFAULT_PLACE = "geoId/06";
const DEFAULT_TOPIC = "dc/topic/Root";
const FEEDBACK_LINK =
  "https://docs.google.com/forms/d/14oXA39Il7f20Rvtqkx_KZNn2NXTi7D_ag_hiX8oH2vc/viewform?usp=pp_url";

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

const DELIM = "___";

// TODO (juliawu): Extract this out to a global flag we can set to remove
//                 all feedback items for external launch.
// Flag to determine whether or not to show link to feedback form
const DEVELOPER_MODE = true;

const toApiList = (input: string): string[] => {
  // Split of an empty string returns [''].  Trim empties.
  return input.split(DELIM).filter((i) => i);
};

/**
 * Application container
 */
export function App(): JSX.Element {
  const [chartData, setChartData] = useState<SubjectPageMetadata | null>();
  const [userMessage, setUserMessage] = useState<string>("");
  const [loadingStatus, setLoadingStatus] = useState<string>("init");
  const [hashParams, setHashParams] = useState<ParsedQuery<string>>(
    queryString.parse(window.location.hash)
  );
  const [query, setQuery] = useState<string>("");
  const [debugData, setDebugData] = useState<any>({});
  const savedContext = useRef([]);

  const buildTopicList = (
    topics: NamedTypedNode[],
    place: string,
    cmpPlace: string,
    placeType: string,
    dc: string,
    disableExploreMore: string
  ): Item[] => {
    if (_.isEmpty(topics)) {
      return [];
    }
    const result: Item[] = [];
    for (const topic of topics) {
      if (topic.dcid == DEFAULT_TOPIC) {
        // Do not show the root topic.
        continue;
      }
      result.push({
        text: topic.name,
        url: `/explore/#t=${topic.dcid}&p=${place}&pcmp=${cmpPlace}&pt=${placeType}&dc=${dc}&em=${disableExploreMore}`,
      });
    }
    return result;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const parsedParams = queryString.parse(hash);
      // Update component state with the parsed parameters from the hash
      setHashParams(parsedParams);
    };

    // Listen to the 'hashchange' event and call the handler
    window.addEventListener("hashchange", handleHashChange);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    setLoadingStatus("loading");
    (async () => {
      let place = getSingleParam(hashParams["p"]);
      let cmpPlace = getSingleParam(hashParams["pcmp"]);
      let topic = getSingleParam(hashParams["t"]);
      let cmpTopic = getSingleParam(hashParams["tcmp"]);
      let placeType = getSingleParam(hashParams["pt"]);
      let paramQuery = getSingleParam(hashParams["q"]);
      const origQuery = getSingleParam(hashParams["oq"]);
      const dc = getSingleParam(hashParams["dc"]);
      const svg = getSingleParam(hashParams["svg"]);
      const disableExploreMore = getSingleParam(hashParams["em"]);

      // Do detection only if `q` is set (from search box) or
      // if `oq` is set without accompanying place and topic.
      if (paramQuery || (origQuery && !place && !topic)) {
        if (!paramQuery) {
          // This should only be set once at the very beginning!
          paramQuery = origQuery;
        }
        setQuery(paramQuery);
        const detectResp = await fetchDetectData(
          paramQuery,
          savedContext.current,
          dc
        );
        if (!detectResp) {
          setLoadingStatus("fail");
          return;
        }
        savedContext.current = detectResp["context"] || [];
        if (_.isEmpty(detectResp["entities"])) {
          setLoadingStatus("fail");
          return;
        }
        setDebugData(detectResp["debug"]);

        place = detectResp["entities"].join(DELIM);
        cmpPlace = (detectResp["comparisonEntities"] || []).join(DELIM);
        topic = detectResp["variables"].join(DELIM);
        cmpTopic = (detectResp["comparisonVariables"] || []).join(DELIM);
        placeType = detectResp["childEntityType"] || "";
        updateHash({
          q: "",
          oq: "",
          t: topic,
          tcmp: cmpTopic,
          p: place,
          pcmp: cmpPlace,
          pt: placeType,
          dc,
          svg,
          em: disableExploreMore,
        });
        return;
      } else if (origQuery) {
        // We have orig_query set with place and topic. So while
        // we're not calling detection, we should still set query state.
        setQuery(origQuery);
      }
      if (!topic) {
        updateHash({
          t: DEFAULT_TOPIC,
          dc,
        });
        return;
      }

      if (!place) {
        updateHash({
          p: DEFAULT_PLACE,
          dc,
        });
        return;
      }
      const places = toApiList(place);
      const cmpPlaces = toApiList(cmpPlace);
      const topics = toApiList(topic);
      const cmpTopics = toApiList(cmpTopic);
      const svgs = toApiList(svg);
      const resp = await fetchFulfillData(
        places,
        topics,
        placeType,
        cmpPlaces,
        cmpTopics,
        dc,
        svgs,
        disableExploreMore
      );
      if (!resp || !resp["place"] || !resp["place"]["dcid"]) {
        setLoadingStatus("fail");
        return;
      }
      const mainPlace = resp["place"];
      const chartData: SubjectPageMetadata = {
        place: {
          dcid: mainPlace["dcid"],
          name: mainPlace["name"],
          types: [mainPlace["place_type"]],
        },
        pageConfig: resp["config"],
        childPlaces: resp["relatedThings"]["childPlaces"],
        peerPlaces: resp["relatedThings"]["peerPlaces"],
        parentPlaces: resp["relatedThings"]["parentPlaces"],
        parentTopics: resp["relatedThings"]["parentTopics"],
        childTopics: resp["relatedThings"]["childTopics"],
        peerTopics: resp["relatedThings"]["peerTopics"],
        exploreMore: resp["relatedThings"]["exploreMore"],
        mainTopic: resp["relatedThings"]["mainTopic"],
        sessionId: "session" in resp ? resp["session"]["id"] : "",
      };
      if (
        chartData &&
        chartData.pageConfig &&
        chartData.pageConfig.categories
      ) {
        // Note: for category links, we only use the main-topic.
        for (const category of chartData.pageConfig.categories) {
          if (category.dcid) {
            category.url = `/explore/#t=${category.dcid}&p=${place}&pcmp=${cmpPlace}&pt=${placeType}&dc=${dc}&em=${disableExploreMore}`;
          }
        }
        if (!query && chartData.mainTopic?.name && chartData.place.name) {
          const q = `${chartData.mainTopic.name} in ${chartData.place.name}`;
          setQuery(q);
        }
      }
      savedContext.current = resp["context"] || [];
      setLoadingStatus("loaded");
      setChartData(chartData);
      setUserMessage(resp["userMessage"]);
    })();
  }, [hashParams]);

  let mainSection: JSX.Element;
  const place = getSingleParam(hashParams["p"]);
  const cmpPlace = getSingleParam(hashParams["pcmp"]);
  const topic = getSingleParam(hashParams["t"]);
  const placeType = getSingleParam(hashParams["pt"]);
  const dc = getSingleParam(hashParams["dc"]);
  const disableExploreMore = getSingleParam(hashParams["em"]);

  const allTopics = chartData?.childTopics
    .concat(chartData?.peerTopics)
    .concat(chartData?.parentTopics);
  const topicList = buildTopicList(
    allTopics,
    place,
    cmpPlace,
    placeType,
    dc,
    disableExploreMore
  );
  const feedbackLink = getFeedbackLink(
    FEEDBACK_LINK,
    query || "",
    debugData,
    _.isEmpty(savedContext.current)
      ? null
      : savedContext.current[0]["insightCtx"]
  );
  const searchSection = (
    <div className="search-section">
      <div className="search-bar-tags">
        <div className="early-preview-tag">Early preview</div>
        {DEVELOPER_MODE && (
          <>
            <span>|</span>
            <div className="feedback-link">
              <a href={feedbackLink} target="_blank" rel="noreferrer">
                Feedback
              </a>
            </div>
          </>
        )}
      </div>

      <div className="search-box-section">
        <TextSearchBar
          inputId="query-search-input"
          onSearch={(q) => {
            updateHash({
              q,
              oq: "",
              t: "",
              p: "",
              pt: "",
              pcmp: "",
              tcmp: "",
              dc,
            });
          }}
          placeholder={query}
          initialValue={query}
          shouldAutoFocus={false}
          clearValueOnSearch={true}
        />
      </div>
    </div>
  );

  if (loadingStatus == "fail") {
    mainSection = (
      <div>
        <div id="user-message">Sorry, could not complete your request.</div>
        {query && searchSection}
      </div>
    );
  } else if (loadingStatus == "loaded" && chartData) {
    const childPlaceType = Object.keys(chartData.childPlaces)[0];
    // Don't set placeType here since it gets passed into child places.
    mainSection = (
      <div className="row explore-charts">
        <div className="col-12">
          {chartData && chartData.pageConfig && (
            <>
              {dc !== "sdg" && searchSection}
              <div id="place-callout">
                {chartData.place.name}
                {!_.isEmpty(chartData.mainTopic) &&
                  chartData.mainTopic.dcid != DEFAULT_TOPIC && (
                    <span> • {chartData.mainTopic.name}</span>
                  )}
              </div>
              {!_.isEmpty(chartData.mainTopic) && (
                <div className="explore-topics-box">
                  <span className="explore-relevant-topics">
                    Relevant topics
                  </span>
                  <ItemList items={topicList}></ItemList>
                </div>
              )}

              {userMessage && <div id="user-message">{userMessage}</div>}
              <RankingUnitUrlFuncContext.Provider
                value={(dcid: string) => {
                  return `/explore/#p=${dcid}&t=${topic}&dc=${dc}&em=${disableExploreMore}`;
                }}
              >
                <NlSessionContext.Provider value={chartData.sessionId}>
                  <ExploreContext.Provider
                    value={{
                      cmpPlace,
                      dc,
                      exploreMore: chartData.exploreMore,
                      place: chartData.place.dcid,
                      placeType,
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
                  topic={
                    _.isEmpty(chartData.mainTopic)
                      ? {
                          dcid: topic,
                          name: "",
                          types: null,
                        }
                      : chartData.mainTopic
                  }
                  cmpPlace={cmpPlace}
                  dc={dc}
                  titleSuffix={
                    getPlaceTypePlural(childPlaceType) +
                    " in " +
                    chartData.place.name
                  }
                  exploreMore={disableExploreMore}
                ></RelatedPlace>
              )}
              {!_.isEmpty(chartData.peerPlaces) && (
                <RelatedPlace
                  relatedPlaces={chartData.peerPlaces}
                  topic={
                    _.isEmpty(chartData.mainTopic)
                      ? {
                          dcid: topic,
                          name: "",
                          types: null,
                        }
                      : chartData.mainTopic
                  }
                  cmpPlace={cmpPlace}
                  dc={dc}
                  titleSuffix={
                    "other " + getPlaceTypePlural(chartData.place.types[0])
                  }
                  exploreMore={disableExploreMore}
                ></RelatedPlace>
              )}
            </>
          )}
        </div>
      </div>
    );
  } else if (loadingStatus == "loading") {
    mainSection = (
      <div>
        <Spinner isOpen={true} />
      </div>
    );
  } else {
    mainSection = <></>;
  }

  return <Container className="explore-container">{mainSection}</Container>;
}

const fetchFulfillData = async (
  places: string[],
  topics: string[],
  placeType: string,
  cmpPlaces: string[],
  cmpTopics: string[],
  dc: string,
  svgs: string[],
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
      disableExploreMore,
    });
    return resp.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const fetchDetectData = async (
  query: string,
  savedContext: any,
  dc: string
) => {
  try {
    const resp = await axios.post(`/api/explore/detect?q=${query}`, {
      contextHistory: savedContext,
      dc,
    });
    return resp.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};
