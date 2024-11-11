/* eslint-disable prettier/prettier */
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
 * A component to display a big text
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { resolveHref } from "../../apps/base/utilities/utilities";
import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../shared/ga_events";
import { Routes } from "../../shared/types/base";

interface BigTextProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

const BigText = ({ routes }: BigTextProps): ReactElement => {
  const theme = useTheme();
  return (
    <section
      css={css`
        background: ${theme.colors.background.alpha.dark};
      `}
    >
      <div
        css={css`
          margin: auto;
          width: 100%;
          max-width: ${theme.width.xl}px;
          padding: ${theme.spacing.section}px 0;
          @media (max-width: ${theme.breakpoints.xl}px) {
            padding: ${theme.spacing.section}px ${theme.spacing.lg}px;
          }
          @media (max-width: ${theme.breakpoints.lg}px) {
            max-width: ${theme.width.lg}px;
          }
          @media (max-width: ${theme.breakpoints.md}px) {
            max-width: 100%;
          }
        `}
      >
        <article
          css={css`
            width: 100%;
            max-width: ${theme.width.md}px;
            @media (max-width: ${theme.breakpoints.md}px) {
              max-width: 100%;
            }
          `}
        >
          <h3
            css={css`
              ${theme.typography.family.heading};
              ${theme.typography.heading.sm};
              color: ${theme.colors.text.alpha.light};
            `}
          >
            Build your own Data Commons  Customize a private instance of the open-source Data Commons platform. You control the data you include and who has access.  
            <a
              href={resolveHref("{static.build}", routes)}
              onClick={(): void => {
                triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
                  [GA_PARAM_ID]: "build-your-own",
                  [GA_PARAM_URL]: "{static.build}",
                });
              }}
              css={css`
                color: ${theme.colors.link.alpha.light};
                margin-left: ${theme.spacing.sm}px;
              `}
            >
              Learn more
            </a>
          </h3>
        </article>
      </div>
    </section>
  );
};

export default BigText;
