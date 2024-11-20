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

import React, { ReactElement } from "react";

import MediaText from "../../../components/content/media_text";
import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../../shared/ga_events";
import { Routes } from "../../../shared/types/base";
import { resolveHref } from "../../base/utilities/utilities";

interface UnitedNationsProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

export const UnitedNations = ({ routes }: UnitedNationsProps): ReactElement => {
  return (
    <MediaText
      mediaType="video"
      mediaSource="O6iVsS-RDYI"
      header={"The United Nations Data Commons for the SDGs"}
    >
      <p>
        United Nations deployed a Data Commons to amplify the impact of their
        Sustainable Development Goals data. With their deployed Data Commons,
        the UN created a centralized repository, allowing for dynamic
        storytelling and targeted analysis related to global progress.{" "}
        <a
          href={resolveHref("{static.build}", routes)}
          onClick={(): void => {
            triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
              [GA_PARAM_ID]: "build-your-own",
              [GA_PARAM_URL]: "{static.build}",
            });
          }}
        >
          Learn more
        </a>
      </p>
    </MediaText>
  );
};
