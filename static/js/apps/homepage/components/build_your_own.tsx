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
 * A component to display the build your own section of the homepage
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { BigText } from "../../../components/content/big_text";
import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../../shared/ga_events";
import { Routes } from "../../../shared/types/base";
import { resolveHref } from "../../base/utilities/utilities";

interface BuildYourOwnProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

export const BuildYourOwn = ({ routes }: BuildYourOwnProps): ReactElement => {
  const theme = useTheme();
  return (
    <BigText>
      <>
        Build your own Data Commons: customize a private instance of the
        open-source Data Commons platform. You control the data you include and
        who has access.
        <a
          href={resolveHref("{static.build}", routes)}
          onClick={(): void => {
            triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
              [GA_PARAM_ID]: "build-your-own",
              [GA_PARAM_URL]: "{static.build}",
            });
          }}
          css={css`
            color: ${theme.colors.link.primary.light};
            margin-left: ${theme.spacing.sm}px;
          `}
        >
          Learn more
        </a>
      </>
    </BigText>
  );
};
