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
import { ChildPlaces } from "../../shared/child_places";
import {
  NlSessionContext,
  RankingUnitUrlFuncContext,
} from "../../shared/context";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getFeedbackLink } from "../../utils/nl_interface_utils";
import { updateHash } from "../../utils/url_utils";
import { ParentPlace } from "./parent_breadcrumbs";
import { Sidebar } from "./sidebar";

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
      let query = getSingleParam(hashParams["q"]);
      const origQuery = getSingleParam(hashParams["oq"]);
      const dc = getSingleParam(hashParams["dc"]);

      // Do detection only if `q` is set (from search box) or
      // if `oq` is set without accompanying place and topic.
      if (query || (origQuery && !place && !topic)) {
        if (!query) {
          // This should only be set once at the very beginning!
          query = origQuery;
        }
        setQuery(query);
        const detectResp = await fetchDetectData(
          query,
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
        });
        return;
      }

      if (!place) {
        updateHash({
          p: DEFAULT_PLACE,
        });
        return;
      }
      const places = toApiList(place);
      const cmpPlaces = toApiList(cmpPlace);
      const topics = toApiList(topic);
      const cmpTopics = toApiList(cmpTopic);
      const resp = await fetchFulfillData(
        places,
        topics,
        placeType,
        cmpPlaces,
        cmpTopics,
        dc
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
        parentPlaces: resp["relatedThings"]["parentPlaces"],
        parentTopics: resp["relatedThings"]["parentTopics"],
        peerTopics: resp["relatedThings"]["peerTopics"],
        topic: resp["relatedThings"]["mainTopic"]["dcid"] || "",
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
            category.url = `/explore/#t=${category.dcid}&p=${place}&pcmp=${cmpPlace}&pt=${placeType}`;
          }
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

  const searchSection = (
    <div className="search-section">
      <div className="experiment-tag">Experiment</div>
      <div className="search-box-section">
        <TextSearchBar
          inputId="query-search-input"
          onSearch={(q) => {
            updateHash({ q, oq: "", t: "", p: "", pt: "", pcmp: "", tcmp: "" });
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
    // Don't set placeType here since it gets passed into child places.
    let urlString = "/explore/#p=${placeDcid}";
    urlString += `&t=${topic}`;
    mainSection = (
      <div className="row explore-charts">
        <div
          id="insight-lhs"
          className="col-md-2x col-lg-2 order-last order-lg-0"
        >
          {chartData && chartData.pageConfig && (
            <>
              <Sidebar
                id={PAGE_ID}
                currentTopicDcid={chartData.topic}
                place={place}
                cmpPlace={cmpPlace}
                categories={chartData.pageConfig.categories}
                peerTopics={chartData.peerTopics}
                setQuery={setQuery}
                placeType={placeType}
              />
              {chartData &&
                chartData.parentTopics.length > 0 &&
                chartData.parentTopics.at(0).dcid != "dc/topic/Root" && (
                  <div className="topics-box">
                    <div className="topics-head">Broader Topics</div>
                    {chartData.parentTopics.map((parentTopic, idx) => {
                      const url = `/explore/#t=${parentTopic.dcid}&p=${place}&pcmp=${cmpPlace}&pt=${placeType}`;
                      return (
                        <a
                          className="topic-link"
                          key={idx}
                          href={url}
                          onClick={() => {
                            setQuery("");
                          }}
                        >
                          {parentTopic.name}
                        </a>
                      );
                    })}
                  </div>
                )}
              {dc !== "sdg" && (
                <ChildPlaces
                  childPlaces={chartData.childPlaces}
                  parentPlace={chartData.place}
                  urlFormatString={urlString}
                ></ChildPlaces>
              )}
            </>
          )}
        </div>
        <div className="col-md-10x col-lg-10">
          {chartData && chartData.pageConfig && (
            <>
              {dc !== "sdg" && searchSection}
              <div id="place-callout">{chartData.place.name}</div>
              {chartData.parentPlaces.length > 0 && (
                <ParentPlace
                  parentPlaces={chartData.parentPlaces}
                  placeType={chartData.place.types[0]}
                  topic={topic}
                ></ParentPlace>
              )}
              {userMessage && <div id="user-message">{userMessage}</div>}
              <RankingUnitUrlFuncContext.Provider
                value={(dcid: string) => {
                  return `/explore/#p=${dcid}&t=${topic}`;
                }}
              >
                <NlSessionContext.Provider value={chartData.sessionId}>
                  <SubjectPageMainPane
                    id={PAGE_ID}
                    place={chartData.place}
                    pageConfig={chartData.pageConfig}
                    svgChartHeight={SVG_CHART_HEIGHT}
                    showExploreMore={true}
                  />
                </NlSessionContext.Provider>
              </RankingUnitUrlFuncContext.Provider>
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
  const feedbackLink = getFeedbackLink(
    FEEDBACK_LINK,
    query || "",
    debugData,
    _.isEmpty(savedContext.current)
      ? null
      : savedContext.current[0]["insightCtx"]
  );

  return (
    <Container className="explore-container">
      <div className="feedback-link">
        <a href={feedbackLink} target="_blank" rel="noreferrer">
          Feedback
        </a>
      </div>
      {mainSection}
    </Container>
  );
}

const fetchFulfillData = async (
  places: string[],
  topics: string[],
  placeType: string,
  cmpPlaces: string[],
  cmpTopics: string[],
  dc: string
) => {
  try {
    const resp = await axios.post(`/api/explore/fulfill`, {
      dc,
      entities: places,
      variables: topics,
      childEntityType: placeType,
      comparisonEntities: cmpPlaces,
      comparisonVariables: cmpTopics,
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
