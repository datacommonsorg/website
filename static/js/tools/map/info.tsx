/**
 * Copyright 2021 Google LLC
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
 * Info page before a chart is shown.
 */

import React, { memo, useContext } from "react";

import { Context } from "./context";
import { ifShowChart } from "./util";

declare global {
  interface Window {
    infoConfig: [
        {
          header: string;
          preposition: string;
          examples: [
            {
              text: string;
              url: string;
            }
          ];
        }
      ];
  }
}

function InfoContent(): JSX.Element {
  const links = window.infoConfig.map((row, ri) => {
    const examples = row.examples.map((example, ei) => {
      const punctuation = ei < row.examples.length - 1 ? ", " : ".";
      return (
        <React.Fragment key={ei}>
          <a href={example.url}>{example.text}</a>
          {punctuation}
        </React.Fragment>
      );
    });
    return (
      <li key={ri}>
        <b>{row.header}</b> {row.preposition} {examples}
      </li>
    );
  });
  console.log(links);

  return (
        <div id="placeholder-container">
          <p>
            The map explorer helps you visualize how a statistical variable from
            the pane to the left can vary across geographic regions.
          </p>
          <ol>
            <li>
              Enter a place in the search box and then select the type of places
              you want to plot in the dropdown menu above.
            </li>
            <li>
              Pick a statistical variable in the left pane. There are thousands
              of statistical variables to choose from, arranged in a topical
              hierarchy.
            </li>
          </ol>
          <p>
            Or you can start your exploration from these interesting points ...
          </p>
          <ul>
            {links}
          </ul>
          <p>Take the data and use it on your site!</p>
          <p>
            <a href="mailto:collaborations@datacommons.org">Send</a> us your
            discoveries!
          </p>
        </div>
  );
}

const MemoizedInfoContent = memo(InfoContent);

export function Info(): JSX.Element {
  const { statVar, placeInfo } = useContext(Context);

  return (
    <>
      {!ifShowChart(statVar.value, placeInfo.value) && (
        <MemoizedInfoContent />
      )}
    </>
  );
}
