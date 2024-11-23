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
 * A component that renders a link chip - a commonly-used component that
 * displays a link inside a Material Design-style chip.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../shared/ga_events";
import { ArrowForward } from "./icons/arrow_forward";

//an individual Link comprising an id, the title and url. This will be rendered in the LinkChip
export interface Link {
  //a unique identifier for the chip (used for map keys)
  id: string;
  //the title of the chip - this will be the text of the link
  title: string;
  //the url of the chip link
  url: string;
}

interface LinkChipProps {
  //the variant of the link chip to display: elevated is a raised grey chip and flat is a flat blue chip
  variant?: "elevated" | "flat";
  //the link chip to be displayed
  linkChip: Link;
  //the section gives location of the chip component in order to give context for the GA event
  section?: string;
}

export const LinkChip = ({
  variant = "elevated",
  linkChip,
  section = "",
}: LinkChipProps): ReactElement => {
  const theme = useTheme();

  const chipStyles = css`
    ${variant === "elevated" ? theme.box.primary : theme.box.secondary};
    ${variant === "elevated" ? theme.elevation.primary : ""};
    ${theme.typography.family.text};
    ${theme.typography.text.md};
    ${theme.radius.primary};
    color: ${variant === "elevated"
      ? theme.colors.link.primary.base
      : theme.colors.text.primary.base};
    line-height: 1rem;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: ${theme.spacing.sm}px;
    padding: 10px ${theme.spacing.lg}px 10px ${theme.spacing.md}px;
    transition: background-color 0.1s ease-in-out, box-shadow 0.1s ease-in-out;

    &:hover {
      text-decoration: none;
      color: ${variant === "elevated"
        ? theme.colors.link.primary.base
        : theme.colors.text.primary.base};
      .icon {
        transform: translateX(2px);
      }
    }

    .icon {
      transition: transform 0.1s ease-in-out;
      svg {
        fill: ${variant === "elevated"
          ? theme.colors.link.primary.base
          : theme.colors.text.primary.base};
      }
    }
  `;

  return (
    <div
      key={linkChip.id}
      css={css`
        display: block;
      `}
    >
      <a
        href={linkChip.url}
        onClick={(): void => {
          triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
            [GA_PARAM_ID]: `${section} ${linkChip.id}`,
            [GA_PARAM_URL]: linkChip.url,
          });
        }}
        css={chipStyles}
      >
        <ArrowForward height={24} />
        {linkChip.title}
      </a>
    </div>
  );
};
