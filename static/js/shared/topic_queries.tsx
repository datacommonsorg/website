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
            <div>
              <b>Here are some examples to get started:</b>
            </div>
            <ul>
              {props.currentTopic.examples.general.map((query, i) => (
                <li key={i}>
                  <QueryLink query={query} appName={props.appName} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {props.currentTopic.examples.specific.length > 0 && (
          <div className="topic-queries">
            <div>
              <b>Try diving deeper:</b>
            </div>
            <ul>
              {props.currentTopic.examples.specific.map((query, i) => (
                <li key={i}>
                  <QueryLink query={query} appName={props.appName} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {props.currentTopic.examples.comparison.length > 0 && (
          <div className="topic-queries">
            <div>
              <b>Combine and compare data from different Data Commons:</b>
            </div>
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
      <div className="topic-more">
        Additional data is available for these topics:{" "}
        {props.additionalTopics.map((item, i) => (
          <span key={i}>
            <a href={`${props.topicUrlPrefix}${item.name}`}>
              {item.title.toLocaleLowerCase()}
            </a>
            {i < Object.keys(props.additionalTopics).length - 1 && ","}{" "}
          </span>
        ))}
        and more
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
  let url = "";
  if (props.appName == "explore") {
    if (query.url) {
      url = `/${props.appName}#${query.url}`;
    } else {
      url = `/${props.appName}#oq=${encodeURIComponent(query.title)}`;
    }
  } else {
    url = `/${props.appName}#q=${encodeURIComponent(query.title)}&a=True`;
  }
  return <a href={url}>{query.title}</a>;
}
