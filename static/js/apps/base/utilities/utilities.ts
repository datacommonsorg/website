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

import { Labels, Routes } from "../../../shared/types/general";

export const resolveHref = (href: string, routes: Routes): string => {
  const regex = /{([^}]+)}/;
  const match = href.match(regex);

  if (match) {
    const routeKey = match[1];
    const resolvedRoute = routes[routeKey] || "";
    return href.replace(regex, resolvedRoute);
  } else {
    return routes[href] || href;
  }
};

export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
};

export const getRoutes = (elementId = "metadata-routes"): Routes => {
  const routeElements = document.getElementById(elementId)?.children;
  const routes: Routes = new Proxy(
    {},
    {
      get: (target, prop): string => {
        return prop in target ? target[prop] : (prop as string);
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

export const getLabels = (elementId = "metadata-labels"): Labels => {
  const labelElements = document.getElementById(elementId)?.children;
  const labels: Labels = new Proxy(
    {},
    {
      get: (target, prop): string => {
        return prop in target ? target[prop] : (prop as string);
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
