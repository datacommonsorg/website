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
 * Main component for DC Explore.
 */
import React, { ReactElement } from "react";

import { TopicConfig, TopicData } from "../../shared/topic_config";
import { ComparisonQueries } from "./components/comparison_queries";
import { ExploreIntro } from "./components/explore_intro";
import { StatVarQueries } from "./components/stat_var_queries";
import { TopicQueries } from "./components/topic_queries";
import topicData from "./topics.json";

const topics: TopicData = topicData;

/**
 * Application container
 */
export function App(): ReactElement {
  const topicSlug = window.location.href.split("/").pop().split("#")[0];
  const topic = topics.topics[topicSlug] as TopicConfig;

  //const dc = topicSlug === "sdg" ? "sdg" : "";

  if (!topic) {
    return (
      <div className="container explore-container">
        <h1>
          No topics found for {'"'}
          {topic}
          {'"'}
        </h1>
      </div>
    );
  }
  /*  const placeholderQuery =
    topic.examples?.general?.length > 0
      ? topic.examples.general[0]
      : { title: "family earnings in california" };
  const placeholderHref =
    `/explore#${placeholderQuery.url}` ||
    `/explore#q=${encodeURIComponent(placeholderQuery.title)}&dc=${dc}`;*/
  return (
    <>
      <ExploreIntro topic={topic} />
      <TopicQueries currentTopic={topic} appName="explore" />
      <StatVarQueries />
      <ComparisonQueries currentTopic={topic} appName="explore" />
    </>
  );
}
