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
import React, { useEffect, useRef, useState } from "react";
import { Container } from "reactstrap";

import { SampleQuery, useStoreActions, useStoreState } from "./app_state";

// Maximum number of example queries to show in the welcome page
export const MAX_EXAMPLE_QUERIES = 12;

interface TopicQueries {
  [key: string]: SampleQuery[];
}

/**
 * NL welcome message
 */
export function QueryWelcome(): JSX.Element {
  const config = useStoreState((s) => s.config);
  const allQueries = useStoreState((s) => s.sampleQueries);
  const topic = useStoreState((s) => s.config.topic);
  const search = useStoreActions((a) => a.search);
  const [exampleQueries, setExampleQueries] = useState<SampleQuery[]>([]);
  const [topicQueries, setTopicQueries] = useState<TopicQueries>({});

  /**
   * Initialize example queries
   */
  useEffect(() => {
    if (!allQueries) {
      return;
    }
    // If a topic is set, show sample queries from that topic
    // Otherwise show a random sample from all topics
    const topicQueries = _.groupBy<SampleQuery>(
      allQueries,
      "topic",
    ) as TopicQueries;
    setTopicQueries(topicQueries);
    if (topic && topicQueries[topic]) {
      setExampleQueries(
        topicQueries[topic].filter((q) => q.wai).slice(0, MAX_EXAMPLE_QUERIES),
      );
    } else {
      // Select 8x queries at random that work as intended
      setExampleQueries(
        _.shuffle(allQueries)
          .filter((q) => q.wai)
          .slice(0, MAX_EXAMPLE_QUERIES),
      );
    }
  }, [topic, allQueries]);

  return (
    <div className="nl-welcome">
      <Container>
        <div className="mb-4">
          <span className="nl-result-icon">
            <img src="/images/logo.png" />
          </span>{" "}
          <a
            href="https://datacommons.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Data Commons
          </a>
          &nbsp;uses public data to answer questions about the environment,
          sustainability, health, education, demographics, and the economy. Ask
          questions using natural language to create data visualizations from
          citable sources. Your feedback will help Data Commons improve.
        </div>
        {exampleQueries.length > 0 ? (
          <div>
            Not sure where to start? Try these{" "}
            {topic && topicQueries[topic] ? (
              <>
                <strong>{topic}</strong>
              </>
            ) : null}{" "}
            queries:
            <ul className="sample-queries">
              {exampleQueries.map((query, i) => (
                <li key={i}>
                  <a
                    href=""
                    onClick={(e) => {
                      e.preventDefault();
                      search({
                        config,
                        nlQueryContext: null,
                        nlQueryHistory: [],
                        query: query.query,
                      });
                    }}
                  >
                    {query.query}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Container>
    </div>
  );
}
