/**
 * Copyright 2022 Google LLC
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

import { urlToDomain } from "../shared/util";
import { formatString, ReplacementStrings } from "./string_utils";

interface ChartTileContainerProp {
  title: string;
  sources: Set<string>;
  children: React.ReactNode;
  replacementStrings: ReplacementStrings;
  // Extra classes to add to the container.
  className?: string;
}

/**
 * A container for any tile containing a chart.
 */
export function ChartTileContainer(props: ChartTileContainerProp): JSX.Element {
  const title = props.title
    ? formatString(props.title, props.replacementStrings)
    : "";
  return (
    <div className={`chart-container ${props.className ? props.className : ""}`}>
      <h4>{title}</h4>
      {props.children}
      {props.sources && (
        <footer>
          <div className="sources">
            Data from {getSourcesJsx(props.sources)}
          </div>
        </footer>
      )}
    </div>
  );
}

function getSourcesJsx(sources: Set<string>): JSX.Element[] {
  if (!sources) {
    return null;
  }

  const sourceList: string[] = Array.from(sources);
  const seenSourceDomains = new Set();
  const sourcesJsx = sourceList.map((source, index) => {
    const domain = urlToDomain(source);
    if (seenSourceDomains.has(domain)) {
      return null;
    }
    seenSourceDomains.add(domain);
    return (
      <span key={source}>
        {index > 0 ? ", " : ""}
        <a href={source}>{domain}</a>
      </span>
    );
  });
  return sourcesJsx;
}
