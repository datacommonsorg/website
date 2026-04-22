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

import React, { RefObject, useState } from "react";

import { intl } from "../../i18n/i18n";
import { messages } from "../../i18n/i18n_messages";
import {
  GA_EVENT_TILE_DOWNLOAD,
  GA_EVENT_TILE_EXPLORE_MORE,
  GA_PARAM_TILE_TYPE,
  triggerGAEvent,
} from "../../shared/ga_events";
import { ObservationSpec } from "../../shared/observation_specs";
import { ApiButton } from "./components/api_button";

const FOOTNOTE_CHAR_LIMIT = 150;

interface ChartFooterPropType {
  // the API root associated with the calls the underlying tile used.
  apiRoot?: string;
  // a function passed through from the chart that handles the task
  // of creating the embedding used in the download functionality.
  handleEmbed?: () => void;
  // A callback function passed through from the chart that will collate
  // a set of observation specs relevant to the chart. These
  // specs can be hydrated into API calls.
  getObservationSpecs?: () => ObservationSpec[];
  // Link to explore more. Only show explore button if this object is non-empty.
  exploreLink?: { displayText: string; url: string };
  // Hyperlink to show in footer. If this is non-empty, a custom link will be shown.
  hyperlink?: string;
  // Text to show above buttons
  footnote?: string;
  // A ref to the chart container element.
  containerRef?: RefObject<HTMLElement>;
  // Additional content that will display in the footer.
  children?: React.ReactNode;
  // Passed into calls to mixer for usage logs. Indicates which DC surface
  // (website, datagemma, etc.) the call originates from.
  surface: string;
}

export function ChartFooter(props: ChartFooterPropType): JSX.Element {
  return (
    <>
      <slot name="footer" {...{ part: "footer" }}>
        <Footnote text={props.footnote} />
      </slot>
      <footer className="chart-container-footer" {...{ part: "tools-footer" }}>
        <div className="main-footer-section">
          <div className="outlinks">
            {props.hyperlink && (
              <a
                className="outlink-item custom-link-outlink"
                href={props.hyperlink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-icons-outlined">link</span>
              </a>
            )}
            {props.handleEmbed && (
              <div className="outlink-item download-outlink">
                <span className="material-icons-outlined">download</span>
                <a
                  href="#"
                  onClick={(event): void => {
                    event.preventDefault();
                    triggerGAEvent(GA_EVENT_TILE_DOWNLOAD, {
                      [GA_PARAM_TILE_TYPE]: props.exploreLink?.displayText,
                    });
                    props.handleEmbed();
                  }}
                >
                  {intl.formatMessage(messages.download)}
                </a>
              </div>
            )}

            {props.getObservationSpecs && (
              <div className="outlink-item api-outlink">
                <ApiButton
                  apiRoot={props.apiRoot}
                  getObservationSpecs={props.getObservationSpecs}
                  containerRef={props.containerRef}
                  surface={props.surface}
                />
              </div>
            )}

            {props.exploreLink && (
              <div className="outlink-item explore-in-outlink">
                <span className="material-icons-outlined">timeline</span>
                <a
                  href={props.exploreLink.url}
                  rel="noopener noreferrer"
                  target="_blank"
                  onClick={(): boolean => {
                    triggerGAEvent(GA_EVENT_TILE_EXPLORE_MORE, {
                      [GA_PARAM_TILE_TYPE]: props.exploreLink?.displayText,
                    });
                    return true;
                  }}
                >
                  {intl.formatMessage(messages.exploreLink, {
                    toolName: props.exploreLink.displayText,
                  })}
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
        onClick={(): void => setShowFullText(!showFullText)}
      >
        {!hideToggle && (showFullText ? " Show less" : " Show more")}
      </span>
    </div>
  );
}
