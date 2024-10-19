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
import { Container } from "reactstrap";

import { NlSearchBar } from "../../components/nl_search_bar";
import {
  GA_EVENT_NL_SEARCH,
  GA_PARAM_QUERY,
  GA_PARAM_SOURCE,
  GA_VALUE_SEARCH_SOURCE_EXPLORE_LANDING,
  triggerGAEvent,
} from "../../shared/ga_events";
import { Topic, TopicConfig, TopicData } from "../../shared/topic_config";
import { TopicQueries } from "../../shared/topic_queries";
import { Item, ItemList } from "../explore/item_list";
import topicData from "./topics.json";

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
    topic.examples?.general?.length > 0
      ? topic.examples.general[0]
      : { title: "family earnings in california" };
  const placeholderHref =
    `/explore#${placeholderQuery.url}` ||
    `/explore#q=${encodeURIComponent(placeholderQuery.title)}&dc=${dc}`;
  return (
    <div className="explore-container">
      <Container>
        <NlSearchBar
          inputId="query-search-input"
          onSearch={(q): void => {
            triggerGAEvent(GA_EVENT_NL_SEARCH, {
              [GA_PARAM_QUERY]: q,
              [GA_PARAM_SOURCE]: GA_VALUE_SEARCH_SOURCE_EXPLORE_LANDING,
            });
            window.location.href =
              q.toLocaleLowerCase() === placeholderQuery.title.toLowerCase()
                ? placeholderHref
                : `/explore#q=${encodeURIComponent(q)}&dc=${dc}`;
          }}
          placeholder={"Enter a question to explore"}
          initialValue={""}
          shouldAutoFocus={false}
        />
        <div className="explore-title">
          <div className="explore-title-image">
            <img alt={`${topic.title} image`} src={topic.image} />
          </div>
          <div className="explore-title-text">
            <h1>{topic.title}</h1>
            <div className="explore-title-sub-topics">
              <ItemList items={subTopicItems} />
            </div>
          </div>
        </div>
        <TopicQueries
          currentTopic={topic}
          appName="explore"
          topicUrlPrefix="/explore/"
          additionalTopics={additionalTopics}
        />
      </Container>
    </div>
  );
}
