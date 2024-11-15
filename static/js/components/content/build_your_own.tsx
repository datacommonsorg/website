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
 * A component to display the build your own Data Commons block
 */

import React, { ReactElement } from "react";

import { resolveHref } from "../../apps/base/utilities/utilities";
import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../shared/ga_events";

interface BuildProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Record<string, string>;
}

const Build = ({ routes }: BuildProps): ReactElement => {
  return (
    <section id="build-your-own" className="build-your-own">
      <div className="container">
        <div className="header">
          <h4>The United Nations Data Commons for the SDGs</h4>
        </div>
        <div className="video-player">
          <iframe
            src="https://www.youtube.com/embed/O6iVsS-RDYI"
            title="YouTube video player"
            style={{ border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          ></iframe>
        </div>
        <div className="video-description">
          <p>
            United Nations deployed a Data Commons to amplify the impact of
            their Sustainable Development Goals data. With their deployed Data
            Commons, the UN created a centralized repository, allowing for
            dynamic storytelling and targeted analysis related to global
            progress.{" "}
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
        </div>
      </div>
    </section>
  );
};

export default Build;
