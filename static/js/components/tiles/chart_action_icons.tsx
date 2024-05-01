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
import { UncontrolledTooltip } from "reactstrap";

import {
  GA_EVENT_TILE_DOWNLOAD,
  GA_EVENT_TILE_EXPLORE_MORE,
  GA_PARAM_TILE_TYPE,
  triggerGAEvent,
} from "../../shared/ga_events";

interface ActionIconsPropType {
  handleEmbed?: () => void;
  id: string;
  // Link to explore more. Only show explore button if this object is non-empty.
  exploreLink?: { displayText: string; url: string };
  children?: React.ReactNode;
  // Text to show above buttons
  footnote?: string;
}

export function ActionIcons(props: ActionIconsPropType): JSX.Element {
  return (
    <div className="outlinks">
      <DownloadAction
        handleEmbed={props.handleEmbed}
        id={props.id}
        gaTileType={props.exploreLink?.displayText}
      ></DownloadAction>
      <ExploreInToolAction
        displayText={props.exploreLink?.displayText}
        id={props.id}
        url={props.exploreLink?.url}
      ></ExploreInToolAction>
    </div>
  );
}

function DownloadAction(props: {
  handleEmbed: () => void;
  id: string;
  gaTileType: string;
}): JSX.Element {
  if (!props.handleEmbed) {
    return null;
  }

  const componentId = `${props.id}-download-link`;

  return (
    <div className="outlink-item">
      <a
        href="#"
        id={componentId}
        onClick={(event) => {
          event.preventDefault();
          triggerGAEvent(GA_EVENT_TILE_DOWNLOAD, {
            [GA_PARAM_TILE_TYPE]: props.gaTileType, //props.exploreLink?.displayText,
          });
          props.handleEmbed();
        }}
      >
        <span className="material-icons-outlined">download</span>
      </a>
      <UncontrolledTooltip
        boundariesElement="window"
        delay={200}
        placement="top"
        target={componentId}
      >
        <b>Download</b> this chart and its values
      </UncontrolledTooltip>
    </div>
  );
}

function ExploreInToolAction(props: {
  displayText: string;
  id: string;
  url: string;
}): JSX.Element {
  if (!props.url || !props.displayText) {
    return null;
  }

  const componentId = `${props.id}-explore-more-link`;

  return (
    <div className="outlink-item">
      <a
        href={props.url}
        id={componentId}
        rel="noopener noreferrer"
        target="_blank"
        onClick={() => {
          triggerGAEvent(GA_EVENT_TILE_EXPLORE_MORE, {
            [GA_PARAM_TILE_TYPE]: props.displayText,
          });
          return true;
        }}
      >
        <span className="material-icons-outlined">timeline</span>
      </a>
      <UncontrolledTooltip
        boundariesElement="window"
        delay={200}
        placement="top"
        target={componentId}
      >
        Explore in {props.displayText}
      </UncontrolledTooltip>
    </div>
  );
}
