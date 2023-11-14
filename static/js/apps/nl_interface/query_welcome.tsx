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
 * Component for NL interface welcome message.
 */
import _ from "lodash";
import React, { useEffect, useState } from "react";
import { Container } from "reactstrap";

import { Topic, TopicConfig } from "../../shared/topic_config";
import { TopicQueries } from "../../shared/topic_queries";
import allTopics from "../explore_landing/topics.json";
import { useStoreState } from "./app_state";

/**
 * NL welcome message
 */
export function QueryWelcome(): JSX.Element {
  const topic = useStoreState((s) => s.config.topic);
  const [currentTopic, setCurrentTopic] = useState<TopicConfig>(null);
  const [additionalTopics, setAdditionalTopics] = useState<Topic[]>([]);

  useEffect(() => {
    const currentTopic = allTopics.topics[topic] as TopicConfig;
    const additionalTopics = allTopics.allTopics
      .map((name) => ({
        name,
        title: allTopics.topics[name]?.title,
      }))
      .filter((item) => !item.title || item.name !== topic) as Topic[];
    setAdditionalTopics(additionalTopics);
    setCurrentTopic(currentTopic);
  }, [topic]);

  return (
    <div className="nl-welcome">
      {currentTopic && topic && (
        <>
          <Container>
            <h1>{currentTopic.title}</h1>
            <p>{currentTopic.description}</p>
            <TopicQueries
              currentTopic={currentTopic}
              topicUrlPrefix="/nl#topic="
              additionalTopics={additionalTopics}
              appName="nl"
            />
          </Container>
        </>
      )}
    </div>
  );
}
