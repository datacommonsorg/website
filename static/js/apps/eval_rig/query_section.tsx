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

import { GoogleSpreadsheet } from "google-spreadsheet";
import React, { useContext, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Col, Row } from "reactstrap";
import rehypeRaw from "rehype-raw";

import { ANSWER_COL, QA_SHEET } from "./constants";
import { AppContext } from "./context";
import { DcCall, EvalSection } from "./eval_section";

export interface Query {
  id: string;
  text: string;
  user: string;
  row: number;
}

export interface QuerySectionProps {
  query: Query;
  calls: DcCall[]; // call id to row index map
}

export function QuerySection(props: QuerySectionProps): JSX.Element {
  const { doc } = useContext(AppContext);

  const [answer, setAnswer] = useState<string>("");

  const loadAnswer = (doc: GoogleSpreadsheet, rowIdx: number) => {
    const sheet = doc.sheetsByTitle[QA_SHEET];
    sheet.getRows({ offset: rowIdx - 1, limit: 1 }).then((rows) => {
      const row = rows[0];
      if (row) {
        setAnswer(row.get(ANSWER_COL));
      }
    });
  };

  useEffect(() => {
    loadAnswer(doc, props.query.row);
  }, [doc, props.query.row]);

  return (
    <div className="query-section">
      <Row>
        <Col>
          <h1>This is the first Query</h1>
          <h3>Question</h3>
          <p>{props.query.text}</p>
          <h3>Answer</h3>
          <ReactMarkdown rehypePlugins={[rehypeRaw] as any}>
            {processText(answer)}
          </ReactMarkdown>
        </Col>
        <Col>
          {answer && (
            <EvalSection queryId={props.query.id} calls={props.calls} />
          )}
        </Col>
      </Row>
    </div>
  );
}

const processText = (text: string): string => {
  return text.replace(
    /\[\s*__DC__#(\d+)\(([^)]+)\)\s*\]/g,
    '<span class="annotation annotation-$1">$2</span>'
  );
};
