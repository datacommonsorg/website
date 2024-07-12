/*
 Copyright 2024 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/*
Component to display the query ID and question as a header above two answers.
*/

import React, { useContext } from "react";

import { QuerySection } from "../query_section";
import { TablePane } from "../table_pane";
import { DocInfo, EvalType, FeedbackStage } from "../types";
import { SessionContext } from "./context";

interface QueryIdAndQuestionPropType {
  docInfo: DocInfo;
}

export function QueryIdAndQuestion(
  props: QueryIdAndQuestionPropType
): JSX.Element {
  const { sessionQueryId } = useContext(SessionContext);

  return (
    <>
      <div className="query-header">
        <h3>Query {sessionQueryId}</h3>
        {props.docInfo.allQuery[sessionQueryId].text}
      </div>
    </>
  );
}
