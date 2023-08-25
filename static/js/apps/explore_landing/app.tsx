/**
 * Copyright 2023 Google LLC
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
import "../../../library";

import React from "react";
import { Container } from "reactstrap";

import { NlSearchBar } from "../../components/nl_search_bar";
import { Topic, TopicConfig } from "../../shared/topic_config";
import { TopicQueries } from "../../shared/topic_queries";
import { Item, ItemList } from "../explore/item_list";
import allTopics from "./topics.json";

/**
 * Application container
 */
export function App(): JSX.Element {
  const topic = window.location.href.split("/").pop().split("#")[0];
  const currentTopic = allTopics.topics[topic] as TopicConfig;
  const additionalTopics = allTopics.allTopics
    .map((name) => ({
      name,
      title: allTopics.topics[name]?.title,
    }))
    .filter((item) => !item.title || item.name !== topic) as Topic[];
  const subTopicItems: Item[] =
    currentTopic.subTopics?.map((query) => ({
      text: query.title,
      url: `/explore#${query.url || "/"}`,
    })) || [];

  let dc = "";
  if (topic === "sdg") {
    dc = "sdg";
  }
  if (!topic) {
    return (
      <div className="explore-container">
        <Container>
          <h1>
            No topics found for {'"'}
            {topic}
            {'"'}
          </h1>
        </Container>
      </div>
    );
  }
  const placeholderQuery =
    currentTopic.examples?.general?.length > 0
      ? currentTopic.examples.general[0]
      : { title: "family earnings in california" };
  const placeholderHref =
    `/explore#${placeholderQuery.url}` ||
    `/explore#q=${encodeURIComponent(placeholderQuery.title)}&dc=${dc}`;
  return (
    <div className="explore-container">
      <Container>
        <NlSearchBar
          inputId="query-search-input"
          onSearch={(q) => {
            window.location.href =
              q.toLocaleLowerCase() === placeholderQuery.title.toLowerCase()
                ? placeholderHref
                : `/explore#q=${encodeURIComponent(q)}&dc=${dc}`;
          }}
          placeholder={"Enter a question or topic to explore"}
          initialValue={""}
          shouldAutoFocus={false}
          clearValueOnSearch={true}
        />
        <div className="explore-title">
          <div className="explore-title-image">
            <img src={currentTopic.image} />
          </div>
          <div className="explore-title-text">
            <h1>{currentTopic.title}</h1>
            <div className="explore-title-sub-topics">
              <ItemList items={subTopicItems} />
            </div>
          </div>
        </div>
        <TopicQueries
          currentTopic={currentTopic}
          appName="explore"
          topicUrlPrefix="/explore/"
          additionalTopics={additionalTopics}
        />
      </Container>
    </div>
  );
}
