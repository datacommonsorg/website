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
 * A component that renders a link icon box - a component that
 * displays a link inside a large Material Design-style rounded box,
 * decorated with an icon.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement, SVGProps } from "react";

import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../shared/ga_events";

//an individual Link comprising the title and url. This will be rendered in the LinkBox
export interface Link {
  //a unique identifier for the box (used for map keys)
  id: string;
  //the title of the box - this will be the text of the link
  title: string;
  //the url of the icon box link
  url: string;
}

interface LinkIconBoxProps {
  // the decorator icon
  icon: ReactElement<SVGProps<SVGSVGElement>>;
  //the link chip to be displayed
  link: Link;
  //the section gives location of the chip component in order to give context for the GA event
  section?: string;
}

export const LinkIconBox = ({
  icon,
  link,
  section = "",
}: LinkIconBoxProps): ReactElement => {
  const theme = useTheme();

  return (
    <div
      css={css`
        display: block;
        padding: 0;
        margin: 0;
        flex-basis: 200px;
        @media (max-width: ${theme.breakpoints.sm}px) {
          flex-grow: 2;
        }

        & a {
          ${theme.box.primary}
          ${theme.elevation.primary}
                ${theme.typography.heading.xs};
          ${theme.radius.primary}
          display: flex;
          width: 100%;
          height: 100%;
          flex-direction: column;
          align-items: flex-start;
          gap: ${theme.spacing.md}px;
          padding: ${theme.spacing.lg}px;
          @media (max-width: ${theme.breakpoints.sm}px) {
            align-items: center;
          }
        }

        & a svg {
          display: block;
          fill: ${theme.colors.background.primary.dark};
        }
      `}
    >
      <a
        href={link.url}
        id="map-button"
        onClick={(): void => {
          triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
            [GA_PARAM_ID]: section,
            [GA_PARAM_URL]: link.id,
          });
        }}
      >
        {icon}
        {link.title}
      </a>
    </div>
  );
};
