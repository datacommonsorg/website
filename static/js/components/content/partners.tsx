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
 * A component that renders the partners section of the home page.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import {
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../shared/ga_events";
import { Partner } from "../../shared/types/homepage";
import { Wrapper } from "../elements/layout/wrapper";

interface PartnersProps {
  //the partners passed from the backend through to the JavaScript via the templates
  partners: Partner[];
  // The GA event ID to use for click tracking.
  gaEvent: string;
}

const Partners = ({
  partners,
  gaEvent: ga_event,
}: PartnersProps): ReactElement => {
  const theme = useTheme();
  return (
    <Wrapper>
      <header
        css={css`
          margin-bottom: ${theme.spacing.lg};
        `}
      >
        <h3
          css={css`
            ${theme.typography.heading.xs}
          `}
        >
          Other organizations with a Data Commons
        </h3>
      </header>
      <ul
        css={css`
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
          gap: ${theme.spacing.lg}px;
          margin: 0;
          padding: 0;
          margin-top: ${theme.spacing.lg}px;
          @media (max-width: ${theme.breakpoints.sm}px) {
            justify-content: center;
          }
        `}
      >
        {partners.map((partner) => (
          <li
            key={partner.id}
            css={css`
              display: block;
              margin: 0;
              padding: 0;
            `}
          >
            <a
              key={partner.id}
              href={partner.url}
              title={partner.title}
              target="_blank"
              rel="noopener noreferrer"
              className={partner.id}
              onClick={(): void => {
                triggerGAEvent(ga_event, {
                  [GA_PARAM_ID]: `partners ${partner.id}`,
                  [GA_PARAM_URL]: partner.url,
                });
              }}
              css={css`
                display: block;
                border-radius: 300px;
                transition: transform 0.3s ease-in-out, border 0.3s ease-in-out,
                  box-shadow 0.3s ease-in-out;
                border: 2px solid transparent;
                &:hover {
                  ${theme.elevation.primary}
                  transform: translateY(-5px);
                  border: 2px solid white;
                }
              `}
            >
              <img
                src={"/images/content/partners/logo_" + partner.id + ".png"}
                alt={partner.title}
                css={css`
                  display: block;
                  width: 100%;
                  height: auto;
                  max-width: 90px;
                `}
              />
            </a>
          </li>
        ))}
      </ul>
    </Wrapper>
  );
};

export default Partners;
