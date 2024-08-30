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

import React from "react";
import ReactDOM from "react-dom";

import { loadLocaleData } from "../../i18n/i18n";
import { Routes } from "../../shared/types/general";
import { FooterApp } from "./footerApp";
import { HeaderApp } from "./headerApp";

export interface Labels {
  dataCommons: string;
  backToHomepage: string;
  showSiteNavigation: string;
  showExplorationTools: string;
  explore: string;
  placeExplorer: string;
  knowledgeGraph: string;
  timelineExplorer: string;
  scatterplotExplorer: string;
  mapExplorer: string;
  statisticalVariableExplorer: string;
  dataDownloadTool: string;
  naturalDisasterDashboard: string;
  sustainabilityExplorer: string;
  showDocumentationLinks: string;
  documentation: string;
  apis: string;
  bigQuery: string;
  tutorials: string;
  contribute: string;
  githubRepository: string;
  showAboutLinks: string;
  about: string;
  aboutDataCommons: string;
  blog: string;
  dataSources: string;
  faq: string;
  frequentlyAskedQuestions: string;
  feedback: string;
  tools: string;
  anInitiativeFrom: string;
  termsAndConditions: string;
  privacyPolicy: string;
  disclaimer: string;
}

window.addEventListener("load", (): void => {
  loadLocaleData("en", [import("../../i18n/compiled-lang/en/units.json")]).then(
    () => {
      renderPage();
    }
  );
});

function renderPage(): void {
  const name = document.getElementById("metadata-base").dataset.name;
  const logoPath = document.getElementById("metadata-base").dataset.logoPath;
  const hideFullFooter =
    document.getElementById("metadata-base").dataset.hideFullFooter === "true";
  const hideSubFooter =
    document.getElementById("metadata-base").dataset.hideSubFooter === "true";
  const subFooterExtra =
    document.getElementById("metadata-base").dataset.subfooterExtra;
  const brandLogoLight =
    document.getElementById("metadata-base").dataset.brandLogoLight === "true";

  const labelElements = document.getElementById("metadata-base-labels").dataset;

  const labels = {} as Labels;
  (Object.keys(labelElements) as Array<keyof Labels>).forEach((key) => {
    labels[key] = labelElements[key];
  });

  const routes = JSON.parse(
    document.getElementById("metadata-base").dataset.routes
  ) as Routes;

  ReactDOM.render(
    React.createElement(HeaderApp, {
      name,
      logoPath,
      labels,
      routes,
    }),
    document.getElementById("app-header-container")
  );

  ReactDOM.render(
    React.createElement(FooterApp, {
      hideFullFooter,
      hideSubFooter,
      subFooterExtra,
      brandLogoLight,
      labels,
      routes,
    }),
    document.getElementById("app-footer-container")
  );
}
