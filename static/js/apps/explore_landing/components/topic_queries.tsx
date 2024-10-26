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

import React, { ReactElement, useMemo } from "react";

import { TopicConfig } from "../../../shared/topic_config";
import { QueryLink } from "./query_link";

interface TopicQueriesProps {
  appName: string;
  currentTopic: TopicConfig;
}

const NUM_COLUMNS = 2;

export function TopicQueries({
  appName,
  currentTopic,
}: TopicQueriesProps): ReactElement {
  const generalTopicColumns = useMemo(() => {
    const examples = currentTopic.examples.general;
    const columnCount = Math.ceil(examples.length / NUM_COLUMNS);

    return Array.from({ length: NUM_COLUMNS }, (_, column) =>
      examples.slice(column * columnCount, column * columnCount + columnCount)
    );
  }, [currentTopic.examples.general]);

  return (
    <>
      {currentTopic.examples.general.length > 0 && (
        <div className="topic-block">
          {generalTopicColumns.map((column, columnIndex) => (
            <div
              className="topic-section"
              key={columnIndex}
              style={{ border: "1px solid red" }}
            >
              {column.map((query, i) => (
                <div className="topic-item" key={i}>
                  <QueryLink query={query} appName={appName} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
