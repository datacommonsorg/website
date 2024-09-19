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
 * Component for result section if loading is successful
 */

import _ from "lodash";
import queryString from "query-string";
import React, { useEffect, useRef } from "react";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import {
  CLIENT_TYPES,
  SVG_CHART_HEIGHT,
  URL_DELIM,
  URL_HASH_PARAMS,
} from "../../constants/app/explore_constants";
import {
  ExploreContext,
  NlSessionContext,
  RankingUnitUrlFuncContext,
} from "../../shared/context";
import { QueryResult, UserMessageInfo } from "../../types/app/explore_types";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import {
  isPlaceOverviewOnly,
  shouldSkipPlaceOverview,
} from "../../utils/explore_utils";
import { getPlaceTypePlural } from "../../utils/string_utils";
import { trimCategory } from "../../utils/subject_page_utils";
import { getUpdatedHash } from "../../utils/url_utils";
import { DebugInfo } from "./debug_info";
import { RelatedPlace } from "./related_place";
import { ResultHeaderSection } from "./result_header_section";
import { SearchSection } from "./search_section";
import { UserMessage } from "./user_message";

const PAGE_ID = "explore";

interface SuccessResultPropType {
  query: string;
  debugData: any;
  exploreContext: any;
  queryResult: QueryResult;
  pageMetadata: SubjectPageMetadata;
  userMessage: UserMessageInfo;
}

export function SuccessResult(props: SuccessResultPropType): JSX.Element {
  if (!props.pageMetadata) {
    return null;
  }
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const chartSectionRef = useRef<HTMLDivElement>(null);
  const childPlaceType = !_.isEmpty(props.pageMetadata.childPlaces)
    ? Object.keys(props.pageMetadata.childPlaces)[0]
    : "";
  const placeUrlVal = (
    props.exploreContext?.entities || [props.pageMetadata.place.dcid]
  ).join(URL_DELIM);
  const topicUrlVal = (props.exploreContext?.variables || []).join(URL_DELIM);
  // TODO: Consider if we want to include both topics.
  const relatedPlaceTopic = _.isEmpty(props.pageMetadata.mainTopics)
    ? {
        dcid: topicUrlVal,
        name: "",
        types: null,
      }
    : props.pageMetadata.mainTopics[0];

  const hashParams = queryString.parse(window.location.hash);
  const maxBlockParam = hashParams[URL_HASH_PARAMS.MAXIMUM_BLOCK];
  const maxBlock = parseInt(maxBlockParam as string);

  useEffect(() => {
    const searchBoundingBox = searchSectionRef.current?.getBoundingClientRect();
    function handleScroll(): void {
      if (!searchBoundingBox) {
        return;
      }
      if (window.scrollY >= searchBoundingBox.height) {
        if (!searchSectionRef.current.classList.contains("sticky")) {
          searchSectionRef.current.classList.add("sticky");
          chartSectionRef.current.style.marginTop =
            searchBoundingBox.height + "px";
        }
      } else {
        chartSectionRef.current.style.marginTop = "0";
        searchSectionRef.current.classList.remove("sticky");
      }
    }

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  const placeOverviewOnly = isPlaceOverviewOnly(props.pageMetadata);
  const emptyPlaceOverview = shouldSkipPlaceOverview(props.pageMetadata);
  return (
    <div
      className={`row explore-charts${
        placeOverviewOnly ? " place-overview-only" : ""
      }`}
    >
      <div className="search-section-container" ref={searchSectionRef}>
        <div className="search-section-content container">
          <DebugInfo
            debugData={props.debugData}
            queryResult={props.queryResult}
          ></DebugInfo>
          <SearchSection
            query={props.query}
            debugData={props.debugData}
            exploreContext={props.exploreContext}
          />
        </div>
      </div>
      <div className="col-12" ref={chartSectionRef}>
        <UserMessage
          userMessage={props.userMessage}
          pageMetadata={props.pageMetadata}
          placeUrlVal={placeUrlVal}
          shouldShowTopics={placeOverviewOnly}
        />
        {props.pageMetadata && !_.isEmpty(props.pageMetadata.pageConfig) && (
          <>
            {!placeOverviewOnly && (
              <ResultHeaderSection
                pageMetadata={props.pageMetadata}
                placeUrlVal={placeUrlVal}
                hideRelatedTopics={false}
              />
            )}
            <RankingUnitUrlFuncContext.Provider
              value={(dcid: string, placeType?: string, apiRoot?: string) => {
                return `${apiRoot || ""}/explore/#${getUpdatedHash({
                  [URL_HASH_PARAMS.PLACE]: dcid,
                  [URL_HASH_PARAMS.TOPIC]: topicUrlVal,
                  [URL_HASH_PARAMS.QUERY]: "",
                  [URL_HASH_PARAMS.CLIENT]: CLIENT_TYPES.RANKING_PLACE,
                })}`;
              }}
            >
              <NlSessionContext.Provider value={props.pageMetadata.sessionId}>
                <ExploreContext.Provider
                  value={{
                    exploreMore: props.pageMetadata.exploreMore,
                    place: props.pageMetadata.place.dcid,
                    placeType: props.exploreContext.childEntityType || "",
                  }}
                >
                  <SubjectPageMainPane
                    id={PAGE_ID}
                    place={props.pageMetadata.place}
                    pageConfig={trimCategory(
                      props.pageMetadata.pageConfig,
                      maxBlock
                    )}
                    svgChartHeight={SVG_CHART_HEIGHT}
                    showExploreMore={true}
                  />
                </ExploreContext.Provider>
              </NlSessionContext.Provider>
            </RankingUnitUrlFuncContext.Provider>
            {!emptyPlaceOverview &&
              !_.isEmpty(props.pageMetadata.childPlaces) && (
                <RelatedPlace
                  relatedPlaces={props.pageMetadata.childPlaces[childPlaceType]}
                  topic={relatedPlaceTopic}
                  titleSuffix={
                    getPlaceTypePlural(childPlaceType) +
                    " in " +
                    props.pageMetadata.place.name
                  }
                ></RelatedPlace>
              )}
            {!emptyPlaceOverview &&
              !_.isEmpty(props.pageMetadata.peerPlaces) && (
                <RelatedPlace
                  relatedPlaces={props.pageMetadata.peerPlaces}
                  topic={relatedPlaceTopic}
                  titleSuffix={
                    "other " +
                    getPlaceTypePlural(props.pageMetadata.place.types[0])
                  }
                ></RelatedPlace>
              )}
          </>
        )}
      </div>
    </div>
  );
}
