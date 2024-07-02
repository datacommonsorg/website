/**
 * Copyright 2024 Google LLC
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

/* Component to wrap the actual feedback section of the feedback pane */

/**
 * Copyright 2024 Google LLC
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

/* Wrapper component around all the right hand side feedback pane components */

import React, { useContext } from "react";
import { Button } from "reactstrap";

import { FEEDBACK_PANE_ID } from "./constants";
import { AppContext, SessionContext } from "./context";
import { EvalList } from "./eval_list";
import { FeedbackNavigation } from "./feedback_navigation";
import { TablePane } from "./table_pane";
import { EvalType } from "./types";

interface FeedbackWrapperPropType {
  onReEval: () => void;
  checkAndSubmit: () => Promise<boolean>;
  children?: React.ReactNode;
}

export function FeedbackWrapper(props: FeedbackWrapperPropType): JSX.Element {
  const { evalType, doc, allCall } = useContext(AppContext);
  const { sessionQueryId } = useContext(SessionContext);

  return (
    <div className="feedback-pane" id={FEEDBACK_PANE_ID}>
      <div className="button-section">
        <Button className="reeval-button" onClick={props.onReEval}>
          <div>
            <span className="material-icons-outlined">redo</span>
            Re-Eval
          </div>
        </Button>
        <EvalList />
      </div>
      <div className="content">
        <div id="question-section">{props.children}</div>
        {evalType === EvalType.RAG && (
          <TablePane doc={doc} calls={allCall[sessionQueryId]} />
        )}
      </div>
      <FeedbackNavigation checkAndSubmit={props.checkAndSubmit} />
      <div id="page-screen" className="screen">
        <div id="spinner"></div>
      </div>
    </div>
  );
}
