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

import React from "react";

import { FEEDBACK_PANE_ID } from "../constants";
import { Navigation } from "./navigation";

interface SxsFeedbackPropType {
  leftSheetId: string;
  rightSheetId: string;
  sortedQueryIds: number[];
}

export function SxsFeedback(props: SxsFeedbackPropType): JSX.Element {
  const checkAndSubmit = () => {
    console.log("checkAndSubmit");
    // TODO Actually store feedback inputs.
    return Promise.resolve(true);
  };

  return (
    <div className="feedback-pane feedback-pane-footer" id={FEEDBACK_PANE_ID}>
      <div className="content">
        <p>Inputs go here.</p>
        <p>If left is better, store sheet ID {props.leftSheetId}.</p>
        <p>If right is better, store sheet ID {props.rightSheetId}.</p>
      </div>
      <Navigation
        sortedQueryIds={props.sortedQueryIds}
        checkAndSubmit={checkAndSubmit}
      />
      <div id="page-screen" className="screen">
        <div id="spinner"></div>
      </div>
    </div>
  );
}
