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

import React from "react";

import { QueryResult, UserMessageInfo } from "../../types/app/explore_types";
import { DebugInfo } from "./debug_info";
import { SearchSection } from "./search_section";
import { UserMessage } from "./user_message";

const DEFAULT_USER_MSG = "Sorry, could not complete your request.";

interface ErrorResultPropType {
  query: string;
  debugData: any;
  exploreContext: any;
  queryResult: QueryResult;
  userMessage: UserMessageInfo;
}

export function ErrorResult(props: ErrorResultPropType): JSX.Element {
  const userMessage = {
    msgList: props.userMessage?.msgList || [DEFAULT_USER_MSG],
    showForm: props.userMessage?.showForm,
  };
  return (
    <div className="row explore-charts">
      {props.query && (
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
