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
import { FooterMenu, HeaderMenuV2 } from "../../shared/types/base";
import { FooterApp } from "./footer_app";
import { HeaderApp } from "./header_app";
import { extractLabels, extractRoutes } from "./utilities/utilities";

window.addEventListener("load", (): void => {
  loadLocaleData("en", [import("../../i18n/compiled-lang/en/units.json")]).then(
    () => {
      renderPage();
    }
  );
});

function renderPage(): void {
  const metadataContainer = document.getElementById("metadata-base");

  const headerMenu = JSON.parse(
    metadataContainer.dataset.header
  ) as HeaderMenuV2[];
  const footerMenu = JSON.parse(
    metadataContainer.dataset.footer
  ) as FooterMenu[];

  const name = metadataContainer.dataset.name;
  const logoPath = metadataContainer.dataset.logoPath;
  const hideFullFooter =
    metadataContainer.dataset.hideFullFooter.toLowerCase() === "true";
  const hideSubFooter =
    metadataContainer.dataset.hideSubFooter.toLowerCase() === "true";
  const subFooterExtra = metadataContainer.dataset.subfooterExtra;
  const brandLogoLight =
    metadataContainer.dataset.brandLogoLight.toLowerCase() === "true";

  //TODO: Move to internationalization library
  const labels = extractLabels();
  const routes = extractRoutes();

  ReactDOM.render(
    React.createElement(HeaderApp, {
      name,
      logoPath,
      headerMenu,
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
      footerMenu,
      labels,
      routes,
    }),
    document.getElementById("app-footer-container")
  );
}