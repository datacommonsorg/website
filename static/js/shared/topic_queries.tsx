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

import { CLIENT_TYPES } from "../constants/app/explore_constants";
import { Query, Topic, TopicConfig } from "./topic_config";

interface TopicQueriesProps {
  appName: string;
  currentTopic: TopicConfig;
  additionalTopics: Topic[];
  topicUrlPrefix: string;
}

export function TopicQueries(props: TopicQueriesProps): ReactElement {
  return (
    <>
      {props.currentTopic.examples.general.length > 0 && (
        <div className="topic-block">
          <div className="topic-list">
            {props.currentTopic.examples.general.map((query, i) => (
              <div className="topic-list-item" key={i}>
                <QueryLink query={query} appName={props.appName} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="topic-block">
        <h3>Explore statistical variables around the world in the Map explorer tool</h3>
        <ul className="stats-list">
          <li><a href="#">Lorem ipsum dolor sit amet consectetur adipisicing elit.</a></li>
          <li><a href="#">Lorem ipsum dolor sit amet consectetur adipisicing elit.</a></li>
          <li><a href="#">Lorem ipsum dolor sit amet consectetur adipisicing elit.</a></li>
          <li><a href="#">Lorem ipsum dolor sit amet consectetur adipisicing elit.</a></li>
          <li><a href="#">Lorem ipsum dolor sit amet consectetur adipisicing elit.</a></li>
        </ul>
      </div>

      {props.currentTopic.examples.comparison.length > 0 && (
        <div className="topic-block">
          <h3>Compare data in relation to education, housing and commute</h3>
          <ul className="topic-list">
            {props.currentTopic.examples.comparison.map((query, i) => (
              <li key={i}>
                <QueryLink query={query} appName={props.appName} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

interface QueryLinkProps {
  query: Query;
  appName: string;
}

function QueryLink(props: QueryLinkProps): ReactElement {
  const { query } = props;
  const cliParam = `client=${CLIENT_TYPES.LANDING}`;
  let url = `${window.location.origin}/${props.appName}#${cliParam}`;
  if (props.appName == "explore") {
    if (query.url) {
      url += `&${query.url}`;
    } else {
      url += `&oq=${encodeURIComponent(query.title)}`;
    }
  } else {
    // NL
    url += `&q=${encodeURIComponent(query.title)}&a=True`;
  }
  return <a href={url}>{query.title}</a>;
}
