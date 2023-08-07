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

/**
 * Footer for charts in tiles.
 */

import _ from "lodash";
import React from "react";

import { NL_SOURCE_REPLACEMENTS } from "../../constants/app/nl_interface_constants";
import { urlToDomain } from "../../shared/util";
import { isNlInterface } from "../../utils/nl_interface_utils";

interface ChartFooterPropType {
  // set of full urls of sources of the data in the chart
  sources: Set<string>;
  handleEmbed?: () => void;
  // Url for the explore more button. Only show explore more button if this url
  // is non-empty.
  exploreMoreUrl?: string;
}

/**
 * Gets the JSX element for displaying a list of sources.
 */
function getSourcesJsx(sources: Set<string>): JSX.Element[] {
  if (!sources) {
    return null;
  }

  const sourceList: string[] = Array.from(sources);
  const seenSourceDomains = new Set();
  const sourcesJsx = sourceList.map((source, index) => {
    // HACK for updating source for NL interface
    let processedSource = source;
    if (isNlInterface()) {
      processedSource = NL_SOURCE_REPLACEMENTS[source] || source;
    }
    const domain = urlToDomain(processedSource);
    if (seenSourceDomains.has(domain)) {
      return null;
    }
    seenSourceDomains.add(domain);
    return (
      <span key={processedSource}>
        {index > 0 ? ", " : ""}
        <a href={processedSource}>{domain}</a>
        {globalThis.viaGoogle ? " via Google" : ""}
      </span>
    );
  });
  return sourcesJsx;
}

export function ChartFooter(props: ChartFooterPropType): JSX.Element {
  return (
    <footer id="chart-container-footer">
      <slot name="footer">
        {!_.isEmpty(props.sources) && (
          <div className="sources">
            Data from {getSourcesJsx(props.sources)}.
          </div>
        )}
      </slot>
      <div className="outlinks">
        {props.handleEmbed && (
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              props.handleEmbed();
            }}
          >
            Export
          </a>
        )}
        {props.exploreMoreUrl && (
          <a
            href={props.exploreMoreUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Explore More ›
          </a>
        )}
      </div>
    </footer>
  );
}
