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
import axios from "axios";
import _ from "lodash";
import Papa from "papaparse";
import React, { useEffect, useRef, useState } from "react";
import { Container } from "reactstrap";

import { getUrlToken } from "../../utils/url_utils";

/**
 * Sample NL query
 */
interface SampleQuery {
  topic: string;
  query: string;
  // "Works as intended"
  wai: boolean;
}

interface QueryWelcomePropType {
  // Sample query click handler
  onQueryItemClick: (queries: string[]) => void;
}

/**
 * NL welcome message
 */
export function QueryWelcome(props: QueryWelcomePropType): JSX.Element {
  const { onQueryItemClick } = props;
  const topic = useRef(getUrlToken("topic"));
  const [allQueries, setAllQueries] = useState<SampleQuery[]>([]);
  const [exampleQueries, setExampleQueries] = useState<SampleQuery[]>([]);

  /**
   * Initialize example queries
   */
  useEffect(() => {
    if (!allQueries) {
      return;
    }
    // If a topic is set, show sample queries from that topic
    // Otherwise show a random sample from all topics
    const topicQueries = _.groupBy<SampleQuery>(allQueries, "topic");
    if (topic.current && topicQueries[topic.current]) {
      setExampleQueries(
        topicQueries[topic.current].filter((q) => q.wai).slice(0, 12)
      );
    } else {
      // Select 8x queries at random that work as intended
      setExampleQueries(
        _.shuffle(allQueries)
          .filter((q) => q.wai)
          .slice(0, 12)
      );
    }
  }, [topic, allQueries]);

  /**
   * Fetch topic queries
   */
  useEffect(() => {
    const initialize = async () => {
      const topicsResponse = await axios.get("/data/nl/topics.csv");
      Papa.parse(topicsResponse.data, {
        complete: (result) => {
          const queries: SampleQuery[] = result["data"].map((item) => ({
            topic: item.category,
            query: item.query,
            wai: (item.wai || "").toLowerCase() === "yes",
          }));
          setAllQueries(queries);
        },
        header: true,
        worker: true,
      });
    };
    initialize();
  }, []);

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
            {topic.current ? (
              <>
                <strong>{topic.current}</strong>
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
                      onQueryItemClick([query.query]);
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
