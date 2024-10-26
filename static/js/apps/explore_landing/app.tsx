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
import { Topic, TopicConfig, TopicData } from "../../shared/topic_config";
import { TopicQueries } from "../../shared/topic_queries";
import { Item, ItemList } from "../explore/item_list";
import topicData from "./topics.json";
import { formatNumber } from "../../i18n/i18n";
import IntroText from "../../components/content/intro_text";

const topics: TopicData = topicData;

/**
 * Application container
 */
export function App(): ReactElement {
  const topicSlug = window.location.href.split("/").pop().split("#")[0];
  const topic = topics.topics[topicSlug] as TopicConfig;
  const additionalTopics = topics.allTopics
    .map((name) => ({
      name,
      title: topics.topics[name]?.title,
    }))
    .filter((item) => !item.title || item.name !== topicSlug) as Topic[];
  const subTopicItems: Item[] =
    topic.subTopics?.map((query) => ({
      text: query.title,
      url: `/explore#${query.url || "/"}`,
    })) || [];

  const dc = topicSlug === "sdg" ? "sdg" : "";

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
  const placeholderQuery =
    topic.examples?.general?.length > 0
      ? topic.examples.general[0]
      : { title: "family earnings in california" };
  const placeholderHref =
    `/explore#${placeholderQuery.url}` ||
    `/explore#q=${encodeURIComponent(placeholderQuery.title)}&dc=${dc}`;
  return (
    <div className="container explore-container">
      <IntroText>
        <header>
          <h1>{topic.title}</h1>
          <p>
            Our {topic.title.toLocaleLowerCase()} data spans over{" "}
            <span
              title={`${formatNumber(
                topic.meta.variableCount,
                "",
                true
              )}`}
            >
              {formatNumber(topic.meta.variableCount)}
            </span>{" "}
            statistical variables. We collect our{" "}
            {topic.title.toLocaleLowerCase()} information from sources
            such as:{" "}
            {topic.meta.sources.map((s, i) => (
              <span key={i}>
                {topic.meta.sources.length > 1 &&
                i === topic.meta.sources.length - 1
                  ? "and "
                  : ""}
                {s}
                {i === topic.meta.sources.length - 1 ? "" : ", "}
              </span>
            ))}
            {"."}
          </p>
        </header>
      </IntroText>
    
      <TopicQueries
        currentTopic={topic}
        appName="explore"
        topicUrlPrefix="/explore/"
        additionalTopics={additionalTopics}
      />
      <ItemList items={subTopicItems} />
    </div>
  );
}
