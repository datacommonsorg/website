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

import React, { useEffect, useRef, useState } from "react";
import { UncontrolledTooltip } from "reactstrap";

import {
  GA_EVENT_TILE_DOWNLOAD,
  GA_EVENT_TILE_EXPLORE_MORE,
  GA_PARAM_TILE_TYPE,
  triggerGAEvent,
} from "../../shared/ga_events";

interface ActionIconPropType {
  icon: string;
  onClickHandler: (event) => void;
  showAction: boolean;
  tooltipContent: string | JSX.Element;
  url?: string;
}

function ActionIcon(props: ActionIconPropType) {
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
    <div className="outlink-item">
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

interface ChartActionsPropType {
  // callback for handling when user clicks on "download" action icon
  handleDownload?: () => void;
  // callback for handling when user clicks on "embed" action icon
  handleEmbed?: () => void;
  id: string;
  // Link to explore more. Only show explore button if this object is non-empty.
  exploreLink?: { displayText: string; url: string };
}

export function ChartActions(props: ChartActionsPropType): JSX.Element {
  const actionOptions: ActionIconPropType[] = [
    {
      icon: "download",
      onClickHandler: (event) => {
        event.preventDefault();
        triggerGAEvent(GA_EVENT_TILE_DOWNLOAD, {
          [GA_PARAM_TILE_TYPE]: props.exploreLink?.displayText,
        });
        props.handleDownload();
      },
      showAction: !!props.handleDownload,
      tooltipContent: (
        <>
          <b>Download</b> this chart and its values
        </>
      ),
    },
    {
      icon: "timeline",
      onClickHandler: () => {
        triggerGAEvent(GA_EVENT_TILE_EXPLORE_MORE, {
          [GA_PARAM_TILE_TYPE]: props.exploreLink?.displayText,
        });
        return true;
      },
      showAction: !!props.exploreLink,
      tooltipContent: (
        <>
          Open this chart in the <b>{props.exploreLink?.displayText}</b>
        </>
      ),
      url: props.exploreLink?.url,
    },
    {
      icon: "code",
      onClickHandler: (event) => {
        event.preventDefault();
        console.log("click code icon");
      },
      showAction: true,
      tooltipContent: "Embed this chart in your website",
    },
    {
      icon: "thumbs_up_down",
      onClickHandler: (event) => {
        event.preventDefault();
        console.log("click thumbs icon");
      },
      showAction: true,
      tooltipContent: "Rate this chart and provide feedback",
    },
  ];
  return (
    <div className="outlinks">
      {actionOptions.map((option, i) => {
        return (
          <ActionIcon {...option} key={`action-icon-${i}-${option.icon}`} />
        );
      })}
    </div>
  );
}
