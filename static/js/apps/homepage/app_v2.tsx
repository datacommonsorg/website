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
 * Main component for Version 2 of the homepage.
 */

//TODO: fold this into app.tsx when revamp is complete and final PR is ready.

import React, { ReactElement } from "react";

import Build from "../../components/content/build";
import HeroVideo from "../../components/content/hero_video";
import Partners from "../../components/content/partners";
import SampleQuestions from "../../components/content/sample_questions";
import Tools from "../../components/content/tools";
import Topics from "../../components/content/topics";
import { Routes } from "../../shared/types/base";
import {
  Partner,
  SampleQuestionCategory,
  Topic,
} from "../../shared/types/homepage";

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
  return (
    <>
      <HeroVideo />
      <Topics topics={topics} />
      <SampleQuestions sampleQuestions={sampleQuestions} />
      <Tools routes={routes} />
      <Build />
      <Partners partners={partners} />
    </>
  );
}
