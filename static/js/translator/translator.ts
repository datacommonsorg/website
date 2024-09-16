/**
 * Copyright 2020 Google LLC
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

/**
 * @fileoverview Translator javascript.
 */

import React from "react";
import ReactDOM from "react-dom";

import { mapping, sparql } from "./constants";
import { Page } from "./page";

/**
 * Update translation results when schema mapping or query changes.
 */
window.addEventListener("load", (): void => {
  ReactDOM.render(
    React.createElement(Page, {
      mapping,
      sparql: sparql.observation,
    }),
    document.getElementById("translator")
  );
});
