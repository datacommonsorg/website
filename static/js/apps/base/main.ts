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
import { FooterMenu, HeaderMenu } from "../../shared/types/base";
import { Labels, Routes } from "../../shared/types/general";
import { FooterApp } from "./footerApp";
import { HeaderApp } from "./headerApp";

window.addEventListener("load", (): void => {
  loadLocaleData("en", [import("../../i18n/compiled-lang/en/units.json")]).then(
    () => {
      renderPage();
    }
  );
});

function renderPage(): void {
  const headerMenu = JSON.parse(
    document.getElementById("metadata-base").dataset.header
  ) as HeaderMenu[];
  const footerMenu = JSON.parse(
    document.getElementById("metadata-base").dataset.footer
  ) as FooterMenu[];
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

  const labelElements = document.getElementById("metadata-labels").children;

  const labels: Labels = new Proxy(
    {},
    {
      get: (target, prop): string => {
        return prop in target ? target[prop] : prop;
      },
    }
  );

  Array.from(labelElements).forEach((element) => {
    const labelTag = element.getAttribute("data-label");
    labels[labelTag] = element.getAttribute("data-value");
  });

  const routeElements = document.getElementById("metadata-routes").children;

  const routes: Routes = new Proxy(
    {},
    {
      get: (target, prop): string => {
        return prop in target ? target[prop] : prop;
      },
    }
  );

  Array.from(routeElements).forEach((element) => {
    const routeTag = element.getAttribute("data-route");
    routes[routeTag] = element.getAttribute("data-value");
  });

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
