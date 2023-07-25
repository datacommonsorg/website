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
import { SubjectPageSidebar } from "../../components/subject_page/sidebar";
import { TextSearchBar } from "../../components/text_search_bar";
import { SVG_CHART_HEIGHT } from "../../constants/app/nl_interface_constants";
import { ChildPlaces } from "../../shared/child_places";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { updateHash } from "../../utils/url_utils";
import { ParentPlace } from "./parent_breadcrumbs";

const PAGE_ID = "insights";

const getSingleParam = (input: string | string[]): string => {
  // If the input is an array, convert it to a single string
  if (Array.isArray(input)) {
    return input[0];
  }
  return input;
};

/**
 * Application container
 */
export function App(): JSX.Element {
  const [chartData, setChartData] = useState<SubjectPageMetadata | null>();
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [hashParams, setHashParams] = useState<ParsedQuery<string>>({});

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
      const place = getSingleParam(hashParams["p"]);
      const topic = getSingleParam(hashParams["t"]);
      const query = getSingleParam(hashParams["q"]);
      const placeType = getSingleParam(hashParams["pt"]);

      let resp;
      if (place && topic) {
        resp = await fetchFulfillData(place, topic, placeType);
      } else if (query) {
        const detectResp = await fetchDetectData(query);
        if (!detectResp["entities"] || !detectResp["variables"]) {
          setLoadingStatus("fail");
          return;
        }
        resp = await fetchFulfillData(
          detectResp["entities"][0],
          detectResp["variables"][0],
          detectResp["childEntityType"] || ""
        );
      }
      if (!resp) {
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
      };
      setLoadingStatus("loaded");
      setChartData(chartData);
    })();
  }, [hashParams]);

  let mainSection;
  const place = getSingleParam(hashParams["p"]);
  const query = getSingleParam(hashParams["q"]);
  const topic = getSingleParam(hashParams["t"]);
  if (loadingStatus == "fail") {
    mainSection = <div>No data is found</div>;
  } else if (loadingStatus == "loaded") {
    let urlString = "/insights/#p=${placeDcid}";
    if (topic) {
      urlString += `&t=${topic}`;
    }
    if (query) {
      urlString += `&q=${query}`;
    }
    mainSection = (
      <div className="insights-charts">
        <div className="row">
          <div className="col-md-3x col-lg-3 order-last order-lg-0">
            {chartData && chartData.pageConfig && (
              <>
                <SubjectPageSidebar
                  id={PAGE_ID}
                  categories={chartData.pageConfig.categories}
                />
                {chartData && chartData.peerTopics.length > 0 && (
                  <div className="topics-box">
                    <div className="topics-head">Similar Topics</div>
                    {chartData.peerTopics.map((peerTopic, idx) => {
                      return (
                        <a
                          className="topic-link"
                          key={idx}
                          href={`/insights/#p=${place}&t=${peerTopic.dcid}`}
                        >
                          {peerTopic.name}
                        </a>
                      );
                    })}
                  </div>
                )}
                {chartData && chartData.parentTopics.length > 0 && (
                  <div className="topics-box">
                    <div className="topics-head">Broader Topics</div>
                    {chartData.parentTopics.map((parentTopic, idx) => {
                      return (
                        <a
                          className="topic-link"
                          key={idx}
                          href={`/insights/#p=${place}&t=${parentTopic.dcid}`}
                        >
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
                {chartData.parentPlaces && (
                  <ParentPlace
                    parentPlaces={chartData.parentPlaces}
                    placeType={chartData.place.types[0]}
                    topic={topic}
                  ></ParentPlace>
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
    <div className="insights-container">
      <Container>
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
    </div>
  );
}

const fetchFulfillData = async (
  place: string,
  topic: string,
  placeType: string
) => {
  try {
    const resp = await axios.post(`/api/insights/fulfill`, {
      entities: [place],
      variables: [topic],
      childEntityType: placeType,
    });
    return resp.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const fetchDetectData = async (query: string) => {
  try {
    const resp = await axios.post(`/api/insights/detect?q=${query}`, {});
    return resp.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};
