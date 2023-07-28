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
 * Main component for DC Insights.
 */

import axios from "axios";
import queryString, { ParsedQuery } from "query-string";
import React, { useEffect, useState } from "react";
import { Container } from "reactstrap";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { TextSearchBar } from "../../components/text_search_bar";
import { SVG_CHART_HEIGHT } from "../../constants/app/nl_interface_constants";
import { ChildPlaces } from "../../shared/child_places";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { updateHash } from "../../utils/url_utils";
import { ParentPlace } from "./parent_breadcrumbs";
import { Sidebar } from "./sidebar";

const PAGE_ID = "insights";

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

/**
 * Application container
 */
export function App(): JSX.Element {
  const [chartData, setChartData] = useState<SubjectPageMetadata | null>();
  const [userMessage, setUserMessage] = useState<string>("");
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [hashParams, setHashParams] = useState<ParsedQuery<string>>({});
  const [query, setQuery] = useState<string>("");
  const [savedContext, setSavedContext] = useState<any>({});

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const parsedParams = queryString.parse(hash);
      // Update component state with the parsed parameters from the hash
      setHashParams(parsedParams);
    };

    // Listen to the 'hashchange' event and call the handler
    window.addEventListener("hashchange", handleHashChange);

    // Call the handler once initially to handle the initial hash value
    handleHashChange();

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
      const q = getSingleParam(hashParams["q"]);

      if (q) {
        setQuery(q);
        const detectResp = await fetchDetectData(q, savedContext);
        setSavedContext(detectResp["context"] || {});
        if (!detectResp["entities"] || !detectResp["variables"]) {
          setLoadingStatus("fail");
          return;
        }

        place = detectResp["entities"].join(DELIM);
        topic = detectResp["variables"].join(DELIM);
        cmpTopic = detectResp["comparisonEntities"].join(DELIM);
        cmpPlace = detectResp["comparisonPlaces"].join(DELIM);
        updateHash({
          q: "",
          t: topic,
          tcmp: cmpTopic,
          p: place,
          pcmp: cmpPlace,
          pt: placeType,
        });
        return;
      }
      if (!place || !topic) {
        return;
      }
      let places = place.split(DELIM);
      let topics = topic.split(DELIM);
      let cmpPlaces = cmpPlace.split(DELIM);
      let cmpTopics = cmpTopic.split(DELIM);
      const resp = await fetchFulfillData(places, topics, placeType, cmpPlaces, cmpTopics);
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
        topic,
      };
      if (
        chartData &&
        chartData.pageConfig &&
        chartData.pageConfig.categories
      ) {
        // Note: for category links, we only use the main-topic.
        for (const category of chartData.pageConfig.categories) {
          category.url = `/insights/#t=${category.dcid}&p=${place}&pcmp=${cmpPlace}`;
        }
      }
      setSavedContext(resp["context"] || {});
      setLoadingStatus("loaded");
      setChartData(chartData);
      setUserMessage(resp["userMessage"]);
    })();
  }, [hashParams]);

  let mainSection;
  const place = getSingleParam(hashParams["p"]);
  const cmpPlace = getSingleParam(hashParams["pcmp"]);
  if (loadingStatus == "fail") {
    mainSection = <div>No data is found</div>;
  } else if (loadingStatus == "loaded" && chartData) {
    let urlString = "/insights/#p=${placeDcid}";
    urlString += `&t=${chartData.topic}`;
    mainSection = (
      <div className="insights-charts">
        <div className="row">
          <div className="col-md-3x col-lg-3 order-last order-lg-0">
            {chartData && chartData.pageConfig && (
              <>
                <Sidebar
                  id={PAGE_ID}
                  currentTopicDcid={chartData.topic}
                  place={place}
                  cmpPlace={cmpPlace}
                  categories={chartData.pageConfig.categories}
                  peerTopics={chartData.peerTopics}
                />
                {chartData && chartData.parentTopics.length > 0 && (
                  <div className="topics-box">
                    <div className="topics-head">Broader Topics</div>
                    {chartData.parentTopics.map((parentTopic, idx) => {
                      let url = `/insights/#t=${parentTopic.dcid}&p=${place}&pcmp={cmpPlace}`;
                      return (
                        <a className="topic-link" key={idx} href={url}>
                          {parentTopic.name}
                        </a>
                      );
                    })}
                  </div>
                )}
                <ChildPlaces
                  childPlaces={chartData.childPlaces}
                  parentPlace={chartData.place}
                  urlFormatString={urlString}
                ></ChildPlaces>
              </>
            )}
          </div>
          <div className="row col-md-9x col-lg-9">
            {chartData && chartData.pageConfig && (
              <>
                <div id="place-callout">{chartData.place.name}</div>
                {chartData.parentPlaces.length > 0 && (
                  <ParentPlace
                    parentPlaces={chartData.parentPlaces}
                    placeType={chartData.place.types[0]}
                    topic={chartData.topic}
                  ></ParentPlace>
                )}
                {userMessage && (
                  <div id="user-message">{userMessage}</div>
                )}
                <SubjectPageMainPane
                  id={PAGE_ID}
                  place={chartData.place}
                  pageConfig={chartData.pageConfig}
                  svgChartHeight={SVG_CHART_HEIGHT}
                  showExploreMore={true}
                />
              </>
            )}
          </div>
        </div>
      </div>
    );
  } else if (loadingStatus == "loading") {
    mainSection = <div>Loading...</div>;
  } else {
    mainSection = <></>;
  }

  return (
    <Container className="insights-container">
      <div className="search-section">
        <div className="search-box-section">
          <TextSearchBar
            inputId="query-search-input"
            onSearch={(q) => {
              updateHash({ q, t: "" });
            }}
            placeholder={query}
            initialValue={""}
            shouldAutoFocus={true}
            clearValueOnSearch={true}
          />
        </div>
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
  cmpTopics: string[]
) => {
  try {
    const resp = await axios.post(`/api/insights/fulfill`, {
      entities: places,
      variables: topics,
      childEntityType: placeType,
      comparisonEntities: cmpPlaces,
      comparisonVariables: cmpTopics
    });
    return resp.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const fetchDetectData = async (query: string, savedContext: any) => {
  try {
    const resp = await axios.post(`/api/insights/detect?q=${query}`, {
      contextHistory: savedContext,
    });
    return resp.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};
