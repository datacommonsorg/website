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

import React from "react";
import ReactDOM from "react-dom";

import { ICON_STYLESHEET_URL } from "./constants";

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
  if (attributeValue.startsWith("[")) {
    // Parse as JSON if attribute value begins with a bracket
    return JSON.parse(attributeValue);
  } else {
    // Otherwise, parse as whitespace separated list
    return attributeValue.split(/\s+/g);
  }
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
): HTMLElement {
  const container = document.createElement("div");

  // Add stylesheet for material icons to the shadow DOM
  const link = document.createElement("link");
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("href", ICON_STYLESHEET_URL);
  container.appendChild(link);

  // Create mount point and render tile in ti
  const mountPoint = document.createElement("div");
  ReactDOM.render(React.createElement(tile, tileProps), mountPoint);
  container.appendChild(mountPoint);

  return container;
}
