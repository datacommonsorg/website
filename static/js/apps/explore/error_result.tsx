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
 * Component for result section if there was an error
 */

import React, { ReactElement } from "react";

import { QueryResult, UserMessageInfo } from "../../types/app/explore_types";
import { DebugInfo } from "./debug_info";
import { SearchSection } from "./search_section";
import { UserMessage } from "./user_message";

const DEFAULT_USER_MSG = "Sorry, could not complete your request.";

interface ErrorResultPropType {
  //the query string that caused the error
  query: string;
  //an object containing the debug data
  debugData: any;
  //the explore context
  exploreContext: any;
  //an object containing the results of the query.
  queryResult: QueryResult;
  //an object containing a list of messages that is passed into the user message component
  userMessage: UserMessageInfo;
  //if true, there is no header bar search, and so we display search inline
  //if false, there is a header bar search, and so we do not display search inline
  hideHeaderSearchBar: boolean;
}

export function ErrorResult(props: ErrorResultPropType): ReactElement {
  const userMessage = {
    msgList: props.userMessage?.msgList || [DEFAULT_USER_MSG],
    showForm: props.userMessage?.showForm,
  };
  return (
    <div className="row explore-charts">
      {props.query && props.hideHeaderSearchBar && (
        <>
          <SearchSection
            query={props.query}
            debugData={props.debugData}
            exploreContext={props.exploreContext}
          />
          <DebugInfo
            debugData={props.debugData}
            queryResult={props.queryResult}
          ></DebugInfo>
        </>
      )}
      <UserMessage userMessage={userMessage} shouldShowTopics={false} />
    </div>
  );
}
