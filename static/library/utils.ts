/**
 * Copyright 2023 Google LLC
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

import { PointApiResponse } from "@datacommonsorg/client";
import React from "react";
import ReactDOM from "react-dom";

import {
  DEFAULT_API_ENDPOINT,
  MATERIAL_ICONS_OUTLINED_STYLESHEET_URL,
  MATERIAL_ICONS_STYLESHEET_URL,
} from "./constants";

/** Library of helper functions shared across web components */

/**
 * Custom attribute converter for Array<String> type attributes.
 * Parses:
 *   (1) A space separated list of values
 *   (2) A JSON formatted list of values
 * into a Array<String> of values.
 *
 * @param attributeValue the attribute value provided to the web component
 * @returns A string array of attribute values
 */
export function convertArrayAttribute(attributeValue: string): string[] {
  if (!attributeValue) {
    return undefined;
  }
  if (attributeValue.startsWith("[")) {
    // Parse as JSON if attribute value begins with a bracket
    return JSON.parse(attributeValue);
  } else {
    // Otherwise, parse as whitespace separated list
    return attributeValue.split(/\s+/g);
  }
}

/**
 * Custom attribute converter for boolean type attributes.
 * Checks that the attribute value does not equal "false".
 *
 * @param attributeValue the attribute value provided to the web component
 * @returns boolean
 */
export function convertBooleanAttribute(attributeValue: string): boolean {
  return attributeValue.toLowerCase() !== "false";
}

/**
 * Create the HTML web component for a tile.
 * @param tile React function to create the Tile's JSX
 * @param tileProps the tile's props
 * @returns HTML Element containing the tile wrapped as a web component
 */
export function createWebComponentElement(
  tile: (props: any) => JSX.Element,
  tileProps: any
): HTMLDivElement {
  const container = document.createElement("div");

  // Add stylesheet for material icons to the shadow DOM
  for (const url of [
    MATERIAL_ICONS_OUTLINED_STYLESHEET_URL,
    MATERIAL_ICONS_STYLESHEET_URL,
  ]) {
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", url);
    container.appendChild(link);
  }

  // Create mount point and render tile in it
  const mountPoint = document.createElement("div");
  ReactDOM.render(React.createElement(tile, tileProps), mountPoint);
  container.appendChild(mountPoint);

  return container;
}

/**
 * Gets a function for processing variable names using variable name regex and
 * a default variable name
 * @param variableNameRegex regex to use for extracting out a part of the name
 * @param defaultVariableName default name to use if nothing extracted out
 */
export function getVariableNameProcessingFn(
  variableNameRegex: string,
  defaultVariableName: string
): (name: string) => string {
  if (!variableNameRegex) {
    return null;
  }

  return (name: string) => {
    const extractedName = name.match(variableNameRegex)?.shift();
    return extractedName || defaultVariableName || name;
  };
}

/**
 * Gets the Data Commons website api root to use.
 * If apiRoot is "/", return the current host as the api root
 * If apiRoot is set to anything else, use that as the api root
 * If unset, use DEFAULT_API_ENDPOINT
 * @param apiRoot api root passed into web component
 */
export function getApiRoot(apiRoot: string): string {
  if (apiRoot === "/") {
    return window.location.origin;
  }
  if (apiRoot) {
    return apiRoot;
  }
  return DEFAULT_API_ENDPOINT;
}

/**
 * Extracts the min and max dates from the given PointApiResponse
 * @param response PointApiResponse object
 */
export function getObservationDateRange(response: PointApiResponse): {
  minDate: string;
  maxDate: string;
} {
  let minDate = "";
  let maxDate = "";
  Object.keys(response.data).forEach((entityDcid) => {
    Object.keys(response.data[entityDcid]).forEach((variableDcid) => {
      const observation = response.data[entityDcid][variableDcid];
      if (!minDate || observation.date < minDate) {
        minDate = observation.date;
      }
      if (!maxDate || observation.date > maxDate) {
        maxDate = observation.date;
      }
    });
  });
  return { minDate, maxDate };
}
