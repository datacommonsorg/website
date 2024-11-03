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
 * Component for topic page welcome message with query examples.
 */

import React, { ReactElement } from "react";

import { BrickWall } from "../../../components/content/brick_wall";
import { TopicConfig } from "../../../shared/topic_config";
import { QueryLink } from "./query_link";

interface TopicQueriesProps {
  appName: string;
  currentTopic: TopicConfig;
}

export function TopicQueries({
  appName,
  currentTopic,
}: TopicQueriesProps): ReactElement {
  const generalTopicQueries = currentTopic.examples.general.map((query) => (
    <QueryLink key={query.url} query={query} appName={appName} />
  ));

  return <BrickWall bricks={generalTopicQueries} />;
}
