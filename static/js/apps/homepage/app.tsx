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

import Partners from "../../components/content/partners";
import Tools from "../../components/content/tools";
import { Section } from "../../components/elements/layout/section";
import { Link } from "../../components/elements/link_chip";
import { GA_EVENT_HOMEPAGE_CLICK } from "../../shared/ga_events";
import { Routes } from "../../shared/types/base";
import {
  Partner,
  SampleQuestionCategory,
  Topic,
} from "../../shared/types/homepage";
import theme from "../../theme/theme";
import { BuildYourOwn } from "./components/build_your_own";
import { HomeHero } from "./components/home_hero";
import { SampleQuestions } from "./components/sample_questions";
import { UnitedNations } from "./components/united_nations";

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
      <HomeHero linkChips={topicLinkChips} />

      <Section>
        <SampleQuestions sampleQuestions={sampleQuestions} />
      </Section>

      <Section variant="large" colorVariant="light">
        <Tools routes={routes} />
      </Section>

      <Section variant="large" colorVariant="dark">
        <BuildYourOwn routes={routes} />
      </Section>

      <Section>
        <UnitedNations routes={routes} />
      </Section>

      <Section>
        <Partners partners={partners} gaEvent={GA_EVENT_HOMEPAGE_CLICK} />
      </Section>
    </ThemeProvider>
  );
}
