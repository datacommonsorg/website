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

/**
 * Entrypoint file for homepage.
 */

import React from "react";
import ReactDOM from "react-dom";

import { loadLocaleData } from "../../i18n/i18n";
import { Routes } from "../../shared/types/general";
import { Topic } from "../../shared/types/homepage";
import { App } from "./app";

// This is a measure to fix JSON that comes in with invalid quoting and thus fails the parse. Eventually this should be fixed in the source.
const correctJSONFormat = (source: string): string => {
  const regex = /('(?=(,\s*')))|('(?=:))|((?<=([:,]\s*))')|((?<={)')|('(?=}))/g;
  return source.replace(regex, '"');
};

window.onload = (): void => {
  loadLocaleData("en", [import("../../i18n/compiled-lang/en/units.json")]).then(
    () => {
      renderPage();
    }
  );
};

function renderPage(): void {
  const topics = JSON.parse(
    correctJSONFormat(document.getElementById("metadata").dataset.topics)
  ) as Topic[];
  const partners = JSON.parse(
    document.getElementById("metadata").dataset.partners
  );

  const routes = JSON.parse(
    document.getElementById("metadata").dataset.routes
  ) as Routes;

  ReactDOM.render(
    React.createElement(App, {
      topics,
      partners,
      routes,
    }),
    document.getElementById("app-container")
  );
}
