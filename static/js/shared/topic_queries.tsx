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
 * Component for topic page welcome message with query examples.
 */

import React from "react";

import { CLIENT_TYPES } from "../constants/app/explore_constants";
import { formatNumber } from "../i18n/i18n";
import { Query, Topic, TopicConfig } from "./topic_config";

interface TopicQueriesProps {
  appName: string;
  currentTopic: TopicConfig;
  additionalTopics: Topic[];
  topicUrlPrefix: string;
}

export function TopicQueries(props: TopicQueriesProps): JSX.Element {
  return (
    <div className="topic-container">
      <div className="topic-queries">
        {props.currentTopic.examples.general.length > 0 && (
          <div className="topic-queries">
            <div className="topic-title">Some examples to get started:</div>
            <ul>
              {props.currentTopic.examples.general.map((query, i) => (
                <li key={i}>
                  <QueryLink query={query} appName={props.appName} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {props.currentTopic.examples.comparison.length > 0 && (
          <div className="topic-queries">
            <div className="topic-title">Combine and compare data:</div>
            <ul>
              {props.currentTopic.examples.comparison.map((query, i) => (
                <li key={i}>
                  <QueryLink query={query} appName={props.appName} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="topic-sources">
        Our {props.currentTopic.title.toLocaleLowerCase()} data spans over{" "}
        <span
          title={`${formatNumber(
            props.currentTopic.meta.variableCount,
            "",
            true
          )}`}
        >
          {formatNumber(props.currentTopic.meta.variableCount)}
        </span>{" "}
        statistical variables. We collect our{" "}
        {props.currentTopic.title.toLocaleLowerCase()} information from sources
        such as:{" "}
        {props.currentTopic.meta.sources.map((s, i) => (
          <span key={i}>
            {props.currentTopic.meta.sources.length > 1 &&
            i === props.currentTopic.meta.sources.length - 1
              ? "and "
              : ""}
            {s}
            {i === props.currentTopic.meta.sources.length - 1 ? "" : ", "}
          </span>
        ))}
        {"."}
      </div>
    </div>
  );
}

interface QueryLinkProps {
  query: Query;
  appName: string;
}

function QueryLink(props: QueryLinkProps): JSX.Element {
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
  console.log(url);
  return <a href={url}>{query.title}</a>;
}
