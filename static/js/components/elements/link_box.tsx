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
 * A component that renders a link box - a component that
 * displays a link inside a Material Design-style rounded box.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  GA_PARAM_QUERY,
  triggerGAEvent,
} from "../../shared/ga_events";

//an individual Link comprising the title and url. This will be rendered in the LinkBox
export interface Link {
  //a unique identifier for the box (used for map keys)
  id: string;
  //the title of the box - this will be the text of the link
  title: string;
  //the url of the box link
  url: string;
}

interface LinkBoxProps {
  //the content color of the link box
  color: "green" | "blue" | "red" | "yellow" | "grey";
  //the link chip to be displayed
  link: Link;
  //an optional category - if given, this will be displayed under the link title
  category?: string;
  //the section gives location of the chip component in order to give context for the GA event
  section?: string;
}

export const LinkBox = ({
  color,
  link,
  category,
  section = "",
}: LinkBoxProps): ReactElement => {
  const theme = useTheme();

  const containerStyles = css`
    display: block;
    list-style: none;
  `;

  const linkStyles = css`
    ${theme.box.primary};
    ${theme.elevation.primary};
    ${theme.radius.primary};
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: ${theme.spacing.sm}px;
    padding: ${theme.spacing.lg}px;

    &:hover {
      text-decoration: none;
    }

    p {
      color: ${theme.colors.box[color].text};
      ${theme.typography.text.xl};
    }

    small {
      color: ${theme.colors.box[color].tag};
      background-color: ${theme.colors.box[color].pill};
      ${theme.typography.text.xs};
      ${theme.radius.secondary};
      display: inline-block;
      padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
    }
  `;

  return (
    <div css={containerStyles}>
      <a
        href={link.url}
        onClick={(): void => {
          if (section) {
            triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
              [GA_PARAM_ID]: section,
              [GA_PARAM_QUERY]: link.title,
            });
          }
        }}
        css={linkStyles}
      >
        <p>{link.title}</p>
        {category && <small>{category}</small>}
      </a>
    </div>
  );
};
