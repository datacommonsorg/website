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

import { Labels, Routes } from "../../../shared/types/base";

//TODO: Revisit the `resolveHref` function after the revamp. Changes to where routes are resolved (Flask/templates) into URLs may make this function unnecessary.
/*
  This function takes a string that may contain a route from the template wrapped in {}.
  The string may be a pure URL with no route, a route such as "{static.homepage}", or
  a route embedded into a string such as "{tools.visualization}#visType=timeline".
  The function will return the string with the route converted.

  The purpose of the function is to flexibly resolve strings from sources such as JSON that may contain
  either routes or raw URLs and to return the final URL.
 */
export const resolveHref = (href: string, routes: Routes): string => {
  const regex = /{([^}]+)}/;
  const match = href.match(regex);

  if (match) {
    const routeKey = match[1];
    const resolvedRoute = routes[routeKey] || "";
    return href.replace(regex, resolvedRoute);
  } else {
    return href;
  }
};

//TODO: Revisit the `slugify` function after the revamp of the home-page, as it may not be required.
/*
  This function takes a string that may contain spaces and capital letters and returns a slugged version
  of the string in kebab-case. It is used to convert labels into slugs that can be used as part of html
  ids (used currently in React components where labels are converted into Ids that previously were hard-coded).
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
};

/*
  This function takes the id of a data container div and returns a route dictionary from the pairs in the container.
  The referenced data container should be of the form:
  <div id="metadata-routes" class="d-none">
    <div data-route="static.route1" data-value="{{ url_for('static.route1') }}"></div>
    <div data-route="static.route2" data-value="{{ url_for('static.route2') }}"></div>
  </div>
 */
export const extractRoutes = (elementId = "metadata-routes"): Routes => {
  const routeElements = document.getElementById(elementId)?.children;
  const routes: Routes = new Proxy<Routes>(
    {},
    {
      get: (target, prop): string => {
        if (typeof prop === "symbol") {
          throw new Error("Invalid property key.");
        }
        if (!(prop in target)) {
          throw new Error(`Route not found: ${String(prop)}`);
        }
        return target[prop];
      },
    }
  );

  if (routeElements) {
    Array.from(routeElements).forEach((element) => {
      const routeTag = element.getAttribute("data-route");
      routes[routeTag] = element.getAttribute("data-value");
    });
  }

  return routes;
};

/*
  This function takes the id of a data container div and returns a label dictionary from the pairs in the container.
  The referenced data container should be of the form:
  <div id="metadata-labels" class="d-none">
    <div data-label="Phrase to be translated" data-value="{% trans %}Phrase to be translated{% endtrans %}"></div>
  </div>
 */
export const extractLabels = (elementId = "metadata-labels"): Labels => {
  const labelElements = document.getElementById(elementId)?.children;
  const labels = new Proxy<Labels>(
    {},
    {
      get: (target, prop): string => {
        if (typeof prop === "symbol") {
          throw new Error("Invalid property key.");
        }

        if (prop in target) {
          return target[prop];
        } else {
          console.log(
            `Requested label "${prop}" does not exist in labels dictionary.`
          );
          return prop as string;
        }
      },
    }
  );

  if (labelElements) {
    Array.from(labelElements).forEach((element) => {
      const labelTag = element.getAttribute("data-label");
      labels[labelTag] = element.getAttribute("data-value");
    });
  }

  return labels;
};

//A breakpoints constant object for responsiveness, for access on the TypeScript side.
export const BREAKPOINTS = {
  sm: 599,
  md: 746,
  mdExpanded: 859,
  lg: 1440,
};
