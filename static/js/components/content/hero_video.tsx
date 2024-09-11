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
 * A component to display the primary video hero component
 */

import React, { ReactElement } from "react";

import { resolveHref } from "../../apps/base/utilities/utilities";
import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../shared/ga_events";
import { Routes } from "../../shared/types/base";

interface HeroProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

const Hero = ({ routes }: HeroProps): ReactElement => {
  return (
    <section id="hero" className="hero">
      <div className="container">
        <div className="video-background">
          <video
            autoPlay
            loop
            muted
            poster="/images/content/home_hero_poster.png"
          >
            <source
              src="/images/content/home_hero_video.mp4"
              type="video/mp4"
            />
          </video>
        </div>
        <div className="big-description">
          <h3>
            Data Commons aggregates and harmonizes global, open data, giving
            everyone the power to uncover insights with natural language
            questions
          </h3>
          <p>
            Data Commons&rsquo; open source foundation allows organizations to
            create tailored, private instances, deciding on the openness of
            their data contributions.{" "}
            <a
              href={resolveHref("{static.build}", routes)}
              onClick={(): void => {
                /* TODO: Pass in GA event so the component can be used on other pages. */
                triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
                  [GA_PARAM_ID]: `hero-video`,
                  [GA_PARAM_URL]: "{static.build}",
                });
              }}
            >
              Build yours today
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
