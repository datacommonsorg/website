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
import React from "react";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import {
  URL_DELIM,
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

const PAGE_ID = "explore";

interface SuccessResultPropType {
  query: string;
  debugData: any;
  exploreContext: any;
  queryResult: QueryResult;
  pageMetadata: SubjectPageMetadata;
  userMessage: string;
}

export function SuccessResult(props: SuccessResultPropType): JSX.Element {
  if (!props.pageMetadata) {
    return null;
  }
  const childPlaceType = !_.isEmpty(props.pageMetadata.childPlaces)
    ? Object.keys(props.pageMetadata.childPlaces)[0]
    : "";
  const placeUrlVal = (
    props.exploreContext?.entities || [props.pageMetadata.place.dcid]
  ).join(URL_DELIM);
  const topicUrlVal = (props.exploreContext?.variables || []).join(URL_DELIM);
  const relatedPlaceTopic = _.isEmpty(props.pageMetadata.mainTopic)
    ? {
        dcid: topicUrlVal,
        name: "",
        types: null,
      }
    : props.pageMetadata.mainTopic;
  return (
    <div className="row explore-charts">
      <div className="col-12">
        <DebugInfo
          debugData={props.debugData}
          queryResult={props.queryResult}
        ></DebugInfo>
        {props.pageMetadata && props.pageMetadata.pageConfig && (
          <>
            {props.exploreContext.dc !== "sdg" && (
              <SearchSection
                query={props.query}
                debugData={props.debugData}
                exploreContext={props.exploreContext}
              />
            )}
            <ResultHeaderSection
              pageMetadata={props.pageMetadata}
              userMessage={props.userMessage}
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
                    pageConfig={props.pageMetadata.pageConfig}
                    svgChartHeight={SVG_CHART_HEIGHT}
                    showExploreMore={true}
                  />
                </ExploreContext.Provider>
              </NlSessionContext.Provider>
            </RankingUnitUrlFuncContext.Provider>
            {!_.isEmpty(props.pageMetadata.childPlaces) && (
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
            {!_.isEmpty(props.pageMetadata.peerPlaces) && (
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
