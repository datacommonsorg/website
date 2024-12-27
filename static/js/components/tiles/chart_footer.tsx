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

import React, { useState } from "react";

import {
  GA_EVENT_TILE_DOWNLOAD,
  GA_EVENT_TILE_EXPLORE_MORE,
  GA_PARAM_TILE_TYPE,
  triggerGAEvent,
} from "../../shared/ga_events";

// Number of characters in footnote to show before "show more"
const FOOTNOTE_CHAR_LIMIT = 150;

interface ChartFooterPropType {
  handleEmbed?: () => void;
  // Link to explore more. Only show explore button if this object is non-empty.
  exploreLink?: { displayText: string; url: string };
  children?: React.ReactNode;
  // Text to show above buttons
  footnote?: string;
}

export function ChartFooter(props: ChartFooterPropType): JSX.Element {
  return (
    <>
      <slot name="footer" {...{ part: "footer" }}>
        <Footnote text={props.footnote} />
      </slot>
      <footer className="chart-container-footer">
        <div className="main-footer-section">
          <div className="outlinks">
            {props.handleEmbed && (
              <div className="outlink-item download-outlink">
                <span className="material-icons-outlined">download</span>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    triggerGAEvent(GA_EVENT_TILE_DOWNLOAD, {
                      [GA_PARAM_TILE_TYPE]: props.exploreLink?.displayText,
                    });
                    props.handleEmbed();
                  }}
                >
                  Download
                </a>
              </div>
            )}
            {props.exploreLink && (
              <div className="outlink-item explore-in-outlink">
                <span className="material-icons-outlined">timeline</span>
                <a
                  href={props.exploreLink.url}
                  rel="noopener noreferrer"
                  target="_blank"
                  onClick={(event) => {
                    triggerGAEvent(GA_EVENT_TILE_EXPLORE_MORE, {
                      [GA_PARAM_TILE_TYPE]: props.exploreLink?.displayText,
                    });
                    return true;
                  }}
                >
                  Explore in {props.exploreLink.displayText}
                </a>
              </div>
            )}
          </div>
          {props.children}
        </div>
      </footer>
    </>
  );
}

function Footnote(props: { text: string }): JSX.Element {
  const [showFullText, setShowFullText] = useState(false);

  if (!props.text) {
    return <></>;
  }

  const hideToggle = props.text.length < FOOTNOTE_CHAR_LIMIT;
  const shortText = props.text.slice(0, FOOTNOTE_CHAR_LIMIT);

  return (
    <div className="chart-footnote">
      {hideToggle || showFullText ? props.text : `${shortText}...`}
      <span
        className="chart-footnote-toggle"
        onClick={() => setShowFullText(!showFullText)}
      >
        {!hideToggle && (showFullText ? " Show less" : " Show more")}
      </span>
    </div>
  );
}
