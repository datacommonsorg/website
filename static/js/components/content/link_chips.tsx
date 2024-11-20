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
 * A component that renders a series of chips that function as links with titles
 */

/**
 * A component to display a big text
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
import { ArrowForward } from "../elements/icons/arrow_forward";

//an individual LinkChip comprising the title and url attributes of the chip.
export interface LinkChip {
  //a unique identifier for the chip (used for map keys)
  id: string;
  //the title of the chip - this will be the text of the link
  title: string;
  //the url of the chip link
  url: string;
}

interface LinkChipsProps {
  //the variant of the link chip to display: elevated is a raised grey chip and flat is a flat blue chip
  variant?: "elevated" | "flat";
  //the title of the component, displayed as a header above the chips
  title?: string;
  //the section gives location of the chip component in order to give context for the GA event
  section: string;
  //the link
  linkChips: LinkChip[];
}

export const LinkChips = ({
  variant = "elevated",
  title,
  section,
  linkChips,
}: LinkChipsProps): ReactElement => {
  const theme = useTheme();
  return (
    <section className="chip-section">
      <div className="container">
        {title && (
          <h3
            css={css`
              ${theme.typography.family.heading};
              ${theme.typography.heading.xs};
              margin-bottom: ${theme.spacing.lg}px;
            `}
          >
            {title}
          </h3>
        )}
        <ul
          css={css`
            margin: 0;
            padding: 0;
            display: flex;
            flex-wrap: wrap;
            max-width: 80%;
            gap: ${theme.spacing.md}px;
            @media (max-width: ${theme.breakpoints.md}px) {
              max-width: 100%;
            }
          `}
        >
          {linkChips.map((linkChip) => (
            <li
              key={linkChip.id}
              className={`${variant}`}
              css={css`
                display: block;
                list-style: none;
                &.elevated {
                  a {
                    ${theme.box.primary};
                    ${theme.elevation.primary};
                    ${theme.colors.link.primary.base};
                    .icon > svg {
                      fill: ${theme.colors.link.primary.base};
                    }
                  }
                }
                &.flat {
                  a {
                    ${theme.box.secondary};
                    ${theme.colors.text.primary.base};
                    .icon > svg {
                      fill: ${theme.colors.text.primary.base};
                    }
                  }
                }
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
                css={css`
                  ${theme.typography.family.text};
                  ${theme.typography.text.md};
                  ${theme.radius.primary};
                  line-height: 1rem;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  gap: ${theme.spacing.sm}px;
                  padding: 10px ${theme.spacing.lg}px 10px ${theme.spacing.md}px;
                `}
              >
                <ArrowForward height={"24px"} />
                {linkChip.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
