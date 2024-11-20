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
 * Main component for the homepage.
 */

import { ThemeProvider } from "@emotion/react";
import React, { ReactElement } from "react";

import BigText from "../../components/content/big_text";
import HeroVideo from "../../components/content/hero_video";
import { LinkChips } from "../../components/content/link_chips";
import MediaText from "../../components/content/media_text";
import Partners from "../../components/content/partners";
import SampleQuestions from "../../components/content/sample_questions";
import Tools from "../../components/content/tools";
import { Section } from "../../components/elements/layout/section";
import { Link } from "../../components/elements/link_chip";
import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../shared/ga_events";
import { Routes } from "../../shared/types/base";
import {
  Partner,
  SampleQuestionCategory,
  Topic,
} from "../../shared/types/homepage";
import theme from "../../theme/theme";
import { resolveHref } from "../base/utilities/utilities";

interface AppProps {
  //the topics passed from the backend through to the JavaScript via the templates
  topics: Topic[];
  //the partners passed from the backend through to the JavaScript via the templates
  partners: Partner[];
  //the sample question categories and questions passed from the backend through to the JavaScript via the templates
  sampleQuestions: SampleQuestionCategory[];
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

/**
 * Application container
 */
export function App({
  topics,
  partners,
  sampleQuestions,
  routes,
}: AppProps): ReactElement {
  const topicLinkChips: Link[] = topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    url: topic.browseUrl,
  }));

  return (
    <ThemeProvider theme={theme}>
      <HeroVideo routes={routes} />

      <Section>
        <LinkChips
          title={"Topics to explore"}
          section="topic"
          linkChips={topicLinkChips}
        />
      </Section>

      <Section>
        <SampleQuestions sampleQuestions={sampleQuestions} />
      </Section>
      {/*<Tools routes={routes} /> */}
      {/*<BigText routes={routes} /> */}
      {/*<MediaText
        mediaType="video"
        mediaSource="O6iVsS-RDYI"
        headerContent={<h4>The United Nations Data Commons for the SDGs</h4>}
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
      </MediaText>*/}
      {/*<Partners partners={partners} gaEvent={GA_EVENT_HOMEPAGE_CLICK} /> */}
    </ThemeProvider>
  );
}
