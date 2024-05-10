/**
 * Copyright 2024 Google LLC
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
 * Icons for downloading, linking, embedding, and ranking in chart footer.
 */

import React, { useEffect, useRef, useState } from "react";
import { UncontrolledTooltip } from "reactstrap";

import {
  GA_EVENT_TILE_DOWNLOAD,
  GA_EVENT_TILE_EXPLORE_MORE,
  GA_PARAM_TILE_TYPE,
  triggerGAEvent,
} from "../../shared/ga_events";

/** Component for a single action/icon */
interface ActionIconPropType {
  // Container element the tooltip should attach to
  container?: HTMLElement;
  // Name of "Material Icons Outlined" icon to show
  icon: string;
  // Callback to run when icon is clicked
  onClickHandler: (event: React.MouseEvent<HTMLElement>) => void;
  // What to display in a tooltip on hover
  tooltipContent: string | JSX.Element;
  // If icon is being used as a link, the url to go to
  url?: string;
}

function ActionIcon(props: ActionIconPropType): JSX.Element {
  const linkRef = useRef<HTMLAnchorElement>();
  const [linkIsReady, setLinkIsReady] = useState(false);

  // Check if anchor link has rendered.
  // Tooltip needs the anchor link to render first to have a target to bind to.
  useEffect(() => {
    if (linkRef.current) {
      setLinkIsReady(true);
    }
  }, [linkRef]);

  return (
    <div className="outlink-item action-icon">
      <a
        href={props.url || "#"}
        onClick={props.onClickHandler}
        ref={linkRef}
        rel={props.url ? "" : "noopener noreferrer"}
        target={props.url ? "" : "_blank"}
      >
        <span className="material-icons-outlined">{props.icon}</span>
      </a>
      {linkIsReady && (
        <UncontrolledTooltip
          boundariesElement="window"
          container={props.container}
          delay={200}
          placement="top"
          target={linkRef.current}
          trigger="hover"
        >
          {props.tooltipContent}
        </UncontrolledTooltip>
      )}
    </div>
  );
}

/** Component for a row of icons to place in chart footer */

interface ChartActionsPropType {
  // Containing HTML element to attach tooltips/modals to
  container?: HTMLElement;
  // Callback for handling when user clicks on "download" action icon
  handleDownload?: () => void;
  // Id of the chart to provide feedback for
  id: string;
  // Link to explore more. Only show explore button if this object is non-empty.
  exploreLink?: { displayText: string; url: string };
}

export function ChartActions(props: ChartActionsPropType): JSX.Element {
  return (
    <>
      <div className="outlinks">
        {props.handleDownload && (
          <ActionIcon
            container={props.container}
            icon="download"
            onClickHandler={(event) => {
              event.preventDefault();
              triggerGAEvent(GA_EVENT_TILE_DOWNLOAD, {
                [GA_PARAM_TILE_TYPE]: props.exploreLink?.displayText,
              });
              props.handleDownload?.();
            }}
            tooltipContent={
              <>
                <b>Download</b> this chart and its values
              </>
            }
          />
        )}
        {props.exploreLink && (
          <ActionIcon
            container={props.container}
            icon="timeline"
            onClickHandler={() => {
              triggerGAEvent(GA_EVENT_TILE_EXPLORE_MORE, {
                [GA_PARAM_TILE_TYPE]: props.exploreLink?.displayText,
              });
              return true;
            }}
            tooltipContent={
              <>
                Open this chart in the <b>{props.exploreLink?.displayText}</b>
              </>
            }
            url={props.exploreLink?.url}
          />
        )}
      </div>
    </>
  );
}
