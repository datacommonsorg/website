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

interface InfoLink {
  text: string;
  url: string;
}

interface InfoRow {
  header: string;
  // If preposition is defined, then examples are expected.
  preposition?: string;
  examples?: InfoLink[];
  // If preposition is not defined, then subheaders are expected and will
  // be used to generate links similar to timelines.
  subheaders: InfoSubheader[];
}

interface InfoSubheader {
  title: string;
  examples: InfoLink[];
}

declare global {
  interface Window {
    // Stored config of sample links for the landing page.
    infoConfig: InfoRow[];
  }
}

function generateLinksJsx(links: InfoLink[]): JSX.Element[] {
  if (!links) return;

  return links.map((link, ei) => {
    const punctuation = ei < links.length - 1 ? ", " : ".";
    return (
      <React.Fragment key={ei}>
        <a href={link.url}>{link.text}</a>
        {punctuation}
      </React.Fragment>
    );
  });
}

function generateSubheadersJsx(subheaders: InfoSubheader[]): JSX.Element[] {
  if (!subheaders) return;
  return subheaders.map((subheader, i) => {
    const links = generateLinksJsx(subheader.examples);
    return (
      <React.Fragment key={i}>
        <br />
        <span>
          {subheader.title}: {links}
        </span>
      </React.Fragment>
    );
  });
}

/**
 * Static content for the info panel that can be memoized.
 */
function InfoExamples(): JSX.Element {
  // Generate links from the global config.
  const links = window.infoConfig.map((row, ri) => {
    const examplesJsx = generateLinksJsx(row.examples);
    const subheadersJsx = generateSubheadersJsx(row.subheaders);
    return (
      <li key={ri}>
        <b>{row.header}</b>{" "}
        {row.preposition && (
          <>
            {row.preposition} {examplesJsx}
          </>
        )}
        {row.subheaders && subheadersJsx}
      </li>
    );
  });

  return <ul>{links}</ul>;
}

export const MemoizedInfoExamples = React.memo(InfoExamples);
