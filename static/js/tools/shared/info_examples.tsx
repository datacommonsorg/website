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

/**
 * A component which renders a memoizable set of links configured and stored in the page window object.
 */

import React from "react";

// Type for a single link.
interface InfoLink {
  text: string;
  url: string;
}

// Type for a single row or bullet (which could contain nested rows of related examples).
interface InfoRow {
  header: string;
  // If preposition or postposition is defined, then examples are expected.
  // Preposition string is prepended before examples.
  preposition?: string;
  // Postposition string is appended after examples.
  postposition?: string;
  examples?: InfoLink[];
  // If preposition or postposition is not defined, then subheaders are expected and will
  // be used to generate links similar to timelines.
  subheaders: InfoSubheader[];
}

interface InfoSubheader {
  title: string;
  examples: InfoLink[];
}

declare global {
  interface Window {
    // Stored config of sample links for the tool info pane.
    infoConfig: { [key: string]: InfoRow[] };
  }
}

function generateLinksJsx(links: InfoLink[]): JSX.Element[] {
  if (!links) return null;

  return links.map((link, ei) => {
    const punctuation = ei < links.length - 1 ? ", " : "";
    return (
      <React.Fragment key={ei}>
        <a href={link.url}>{link.text}</a>
        {punctuation}
      </React.Fragment>
    );
  });
}

function generateSubheadersJsx(subheaders: InfoSubheader[]): JSX.Element[] {
  if (!subheaders) return null;
  return subheaders.map((subheader, i) => {
    const links = generateLinksJsx(subheader.examples);
    return (
      <React.Fragment key={i}>
        <br />
        <span>
          {subheader.title && <>{subheader.title}: </>}
          {links}
        </span>
      </React.Fragment>
    );
  });
}

/**
 * Static content for the info panel that is generated from the config stored in
 * the global window object.
 */
function InfoExamples(props: { configKey: string }): JSX.Element {
  if (!window.infoConfig[props.configKey]) {
    return null;
  }
  const links = window.infoConfig[props.configKey].map((row, ri) => {
    const examplesJsx = generateLinksJsx(row.examples);
    const subheadersJsx = generateSubheadersJsx(row.subheaders);
    return (
      <li key={ri}>
        <b>{row.header}</b>{" "}
        {(row.preposition || row.postposition) && (
          <>
            {row.preposition} {examplesJsx}
            {row.postposition && <> {row.postposition}</>}.
          </>
        )}
        {row.subheaders && subheadersJsx}
      </li>
    );
  });

  return <ul>{links}</ul>;
}

export const MemoizedInfoExamples = React.memo(InfoExamples);
