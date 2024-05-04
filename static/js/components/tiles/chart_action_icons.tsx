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
import { ChartEmbed } from "./modal/chart_embed";
import { ChartFeedback } from "./modal/chart_feedback";

interface ActionIconPropType {
  icon: string;
  onClickHandler: (event) => void;
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
  id: string;
  // Link to explore more. Only show explore button if this object is non-empty.
  exploreLink?: { displayText: string; url: string };
}

export function ChartActions(props: ChartActionsPropType): JSX.Element {
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const embedToggle = () => {
    setShowEmbedModal(!showEmbedModal);
  };

  const feedbackToggle = () => {
    setShowFeedbackModal(!showFeedbackModal);
  };

  return (
    <>
      <div className="outlinks">
        {props.handleDownload && (
          <ActionIcon
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
        <ActionIcon
          icon="code"
          onClickHandler={(event) => {
            event.preventDefault();
            setShowEmbedModal(true);
          }}
          tooltipContent="Embed this chart in your website"
        />
        <ActionIcon
          icon="thumbs_up_down"
          onClickHandler={(event) => {
            event.preventDefault();
            setShowFeedbackModal(true);
          }}
          tooltipContent="Rate this chart and provide feedback"
        />
      </div>
      {showEmbedModal && (
        <ChartEmbed
          isOpen={showEmbedModal}
          toggleCallback={embedToggle}
          chartType="line"
          chartAttributes={{
            variables: ["Count_Person_Male", "Count_Person_Female"],
            places: ["geoId/06"],
          }}
        />
      )}
      {showFeedbackModal && (
        <ChartFeedback
          chartId={props.id}
          isOpen={showFeedbackModal}
          toggleCallback={feedbackToggle}
        />
      )}
    </>
  );
}
