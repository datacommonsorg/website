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
 * Entry point for the base template. This file will render two apps: one for the header and one for the footer.
 */

import React from "react";
import ReactDOM from "react-dom";

import { loadLocaleData } from "../../i18n/i18n";
import { HeaderMenu } from "../../shared/types/base";
import { FooterApp } from "./footer_app";
import { HeaderApp } from "./header_app";
import { extractLabels, extractRoutes } from "./utilities/utilities";

window.addEventListener("load", async (): Promise<void> => {
  // Load locale data
  const metadataContainer = document.getElementById("metadata-base");
  const locale = metadataContainer.dataset.locale;
  await loadLocaleData(locale, [
    import(`../../i18n/compiled-lang/${locale}/units.json`),
  ]);

  // Render the page
  renderPage(metadataContainer);
});

async function renderPage(metadataContainer: HTMLElement): Promise<void> {
  const headerMenu = JSON.parse(
    metadataContainer.dataset.header
  ) as HeaderMenu[];

  //TODO: once confirmed, remove the footer menu json and types.
  const name = metadataContainer.dataset.name;
  const logoPath = metadataContainer.dataset.logoPath;
  const logoWidth = metadataContainer.dataset.logoWidth;
  const hideHeaderSearchBar =
    metadataContainer.dataset.hideHeaderSearchBar.toLowerCase() === "true";
  const searchBarHashMode =
    metadataContainer.dataset.searchBarHashMode.toLowerCase() === "true";
  const gaValueSearchSource =
    metadataContainer.dataset.gaValueSearchSource.trim() === ""
      ? null
      : metadataContainer.dataset.gaValueSearchSource.toLowerCase();
  const brandLogoLight =
    metadataContainer.dataset.brandLogoLight.toLowerCase() === "true";

  //TODO: Move to internationalization library
  const labels = extractLabels();
  const routes = extractRoutes();

  ReactDOM.render(
    React.createElement(HeaderApp, {
      name,
      logoPath,
      logoWidth,
      headerMenu,
      hideHeaderSearchBar,
      searchBarHashMode,
      gaValueSearchSource,
      labels,
      routes,
    }),
    document.getElementById("main-header")
  );

  ReactDOM.render(
    React.createElement(FooterApp, {
      brandLogoLight,
      labels,
    }),
    document.getElementById("main-footer")
  );
}
