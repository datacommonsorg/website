/**
 * Copyright 2025 Google LLC
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

// TODO: Revisit the `resolveHref` function after the revamp. Changes to where routes are resolved (Flask/templates) into URLs may make this function unnecessary.
/**
 * This function takes a string that may contain a route from the template wrapped in {}.
 * The string may be a pure URL with no route, a route such as "{static.homepage}", or
 * a route embedded into a string such as "{tools.visualization}#visType=timeline".
 * The function will return the string with the route converted.
 *
 * The purpose of the function is to flexibly resolve strings from sources such as JSON that may contain
 * either routes or raw URLs and to return the final URL.
 */
export const resolveHref = (href: string, routes: Routes): string => {
  const regex = /{([^}]+)}/;
  const match = href.match(regex);

  if (match) {
    const routeKey = match[1];
    const resolvedRoute = routes[routeKey] || "";

    let url = href.replace(regex, resolvedRoute);

    // TODO(beets): Find a more appropriate place to do this only for feedback links.
    if (routeKey === "feedback-prefill") {
      const windowHash = window.location.hash;
      if (windowHash) {
        url += encodeURIComponent(windowHash);
      }
    }

    return url;
  } else {
    return href;
  }
};

/**
 * This function takes a string that may contain spaces and capital letters and returns a slugged version
 * of the string in kebab-case. It is used to convert labels into slugs that can be used as part of html
 * ids (used currently in React components where labels are converted into Ids that previously were hard-coded).
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

/**
 * This function takes the id of a data container div and returns a route dictionary from the pairs in the container.
 * The referenced data container should be of the form:
 * <div id="metadata-routes" class="d-none">
 *   <div data-route="static.route1" data-value="{{ url_for('static.route1') }}"></div>
 *   <div data-route="static.route2" data-value="{{ url_for('static.route2') }}"></div>
 * </div>
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

/**
 * This function takes the id of a data container div and returns a label dictionary from the pairs in the container.
 * The referenced data container should be of the form:
 * <div id="metadata-labels" class="d-none">
 *   <div data-label="Phrase to be translated" data-value="{% trans %}Phrase to be translated{% endtrans %}"></div>
 * </div>
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

// TODO(nick-next): Write tests for humanizeIsoDuration
/**
 * This function takes an ISO 8601 duration (https://en.wikipedia.org/wiki/ISO_8601#Durations)
 * and converts it to a human-readable format. These durations, such as P1D or P1Y are
 * used in metadata to indicate periodicity.
 *
 * Examples:
 *   P1Y   -> "Yearly"
 *   P3M   -> "Every 3 months"
 *   P1W   -> "Weekly"
 *   P5D   -> "Every 5 days"
 *   PT6H  -> "Every 6 hours"
 *   PT30M -> "Every 30 minutes"
 *   PT1S  -> "Every second"
 *   P1Y2M -> "Every 1 year and 2 months"
 */
export function humanizeIsoDuration(iso: string): string {
  const match = iso.match(
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
  );

  if (!match) return iso;

  const [, years, months, weeks, days, hours, minutes, seconds] = match.map(
    (v) => (v === undefined ? 0 : parseInt(v, 10))
  );

  const units = [
    { value: years, singular: "year", plural: "years" },
    { value: months, singular: "month", plural: "months" },
    { value: weeks, singular: "week", plural: "weeks" },
    { value: days, singular: "day", plural: "days" },
    { value: hours, singular: "hour", plural: "hours" },
    { value: minutes, singular: "minute", plural: "minutes" },
    { value: seconds, singular: "second", plural: "seconds" },
  ];

  const durationUnits = units.filter((unit) => unit.value > 0);
  if (durationUnits.length === 0) return iso;

  const formattedParts = durationUnits.map((unit) => {
    const label = unit.value === 1 ? unit.singular : unit.plural;
    return `${unit.value} ${label}`;
  });

  if (durationUnits.length === 1) {
    const unit = durationUnits[0];

    if (unit.value === 1) {
      if (unit.singular === "year") return "Yearly";
      if (unit.singular === "month") return "Monthly";
      if (unit.singular === "week") return "Weekly";
      if (unit.singular === "day") return "Daily";
      if (unit.singular === "hour") return "Hourly";
      if (unit.singular === "minute") return "Every minute";
      if (unit.singular === "second") return "Every second";
    }

    return `Every ${unit.value} ${
      unit.value === 1 ? unit.singular : unit.plural
    }`;
  }

  let result: string;
  if (formattedParts.length === 2) {
    result = formattedParts.join(" and ");
  } else {
    const lastPart = formattedParts.pop();
    result = `${formattedParts.join(", ")}, and ${lastPart}`;
  }

  return `Every ${result}`;
}
