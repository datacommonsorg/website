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

import React, { ReactElement } from "react";

import { NlSearchBar } from "../../components/nl_search_bar";
import {
  GA_EVENT_NL_SEARCH,
  GA_PARAM_QUERY,
  GA_PARAM_SOURCE,
  GA_VALUE_SEARCH_SOURCE_HOMEPAGE,
  triggerGAEvent,
} from "../../shared/ga_events";
import { Routes } from "../../shared/types/base";
import { Partner, Topic } from "../../shared/types/homepage";
import DataSize from "./components/data_size";
import LearnMore from "./components/learn_more";
import Partners from "./components/partners";
import SearchAnimation from "./components/search_animation";
import Tools from "./components/tools";
import Topics from "./components/topics";

interface AppProps {
  //the topics passed from the backend through to the JavaScript via the templates
  topics: Topic[];
  //the partners passed from the backend through to the JavaScript via the templates
  partners: Partner[];
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

/**
 * Application container
 */
export function App({ topics, partners, routes }: AppProps): ReactElement {
  return (
    <>
      <section id="homepage-top">
        <div id="search-container" className="container">
          <NlSearchBar
            inputId="query-search-input"
            onSearch={(q): void => {
              triggerGAEvent(GA_EVENT_NL_SEARCH, {
                [GA_PARAM_QUERY]: q,
                [GA_PARAM_SOURCE]: GA_VALUE_SEARCH_SOURCE_HOMEPAGE,
              });
              window.location.href = `/explore#q=${encodeURIComponent(q)}`;
            }}
            placeholder={"Enter a question to explore"}
            initialValue={""}
            shouldAutoFocus={false}
          />
        </div>
      </section>

      <SearchAnimation />

      <DataSize />

      <div className="divider container"></div>

      <section id="topics">
        <Topics topics={topics} />
      </section>

      <div className="background-gradient">
        <Tools routes={routes} />
        <LearnMore routes={routes} />
        <Partners partners={partners} />
      </div>
    </>
  );
}
