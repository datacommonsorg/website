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
import React, { useEffect, useState } from "react";
import { Col, Row } from "reactstrap";

import { QASheet } from "./constants";
import { EvalSection } from "./eval_section";

export interface Query {
  rowIdx: number;
  text: string;
  user: string;
}

export interface QuerySectionProps {
  doc: GoogleSpreadsheet;
  query: Query;
  // call id to row index map
  call: Record<string, number>;
}

export function QuerySection(props: QuerySectionProps): JSX.Element {
  const [answer, setAnswer] = useState<string>("");

  const loadAnswer = (doc: GoogleSpreadsheet, rowIndex: number) => {
    doc.loadInfo().then(() => {
      const qaSheet = doc.sheetsByTitle[QASheet];
      const address = `D${rowIndex + 1}`;
      qaSheet.loadCells(address).then(() => {
        setAnswer(qaSheet.getCellByA1(address).value as string);
      });
    });
  };

  const firstCall = Object.keys(props.call)[0];

  useEffect(() => {
    loadAnswer(props.doc, props.query.rowIdx);
  }, [props.doc, props.query.rowIdx]);

  return (
    <div className="query-section">
      <Row>
        <Col>
          <h1>This is the first Query</h1>
          <h3>Question</h3>
          <p>{props.query.text}</p>
          <h3>Answer</h3>
          <p>{answer}</p>
        </Col>
        <Col>
          <h1>This is the first Call</h1>
          <EvalSection doc={props.doc} rowIdx={props.call[firstCall]} />
        </Col>
      </Row>
    </div>
  );
}
