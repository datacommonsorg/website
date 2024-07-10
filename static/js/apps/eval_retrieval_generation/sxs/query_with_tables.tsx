import React, { useContext } from "react";

import { QuerySection } from "../query_section";
import { TablePane } from "../table_pane";
import { DocInfo, EvalType, FeedbackStage } from "../types";
import { SessionContext } from "./context";

interface QueryWithTablesPropType {
  docInfo: DocInfo;
}

export function QueryWithTables(props: QueryWithTablesPropType): JSX.Element {
  const { sessionQueryId } = useContext(SessionContext);

  return (
    <>
      <div className="sxs-pane">
        <QuerySection
          doc={props.docInfo.doc}
          evalType={props.docInfo.evalType}
          feedbackStage={FeedbackStage.SXS}
          query={props.docInfo.allQuery[sessionQueryId]}
        />
        {props.docInfo.evalType === EvalType.RAG && (
          <TablePane
            doc={props.docInfo.doc}
            calls={props.docInfo.allCall[sessionQueryId]}
          />
        )}
      </div>
    </>
  );
}
