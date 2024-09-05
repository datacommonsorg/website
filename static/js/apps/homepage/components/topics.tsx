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

import React, { ReactElement } from "react";

import { Topic } from "../../../shared/types/homepage";

interface TopicsProps {
  topics: Topic[];
}

const Topics = ({ topics }: TopicsProps): ReactElement => {
  return (
    <div className="container">
      <h3>Explore the Data</h3>
      <div className="topics-container">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className="topic-card clickable"
            onClick={(): void => {
              window.location.href = topic.browseUrl;
            }}
          >
            <div className="topic-card-body">
              <div className="topic-card-image-container">
                <div
                  className="topic-card-image"
                  style={{
                    backgroundPositionY: `-${topic["sprite-index"] * 141}px`,
                  }}
                ></div>
              </div>
              <div className="topic-card-title">{topic.title}</div>
              <div className="topic-card-description">{topic.description}</div>
              <div className="topic-card-links">
                <a href={topic.browseUrl}>
                  <span className="material-icons-outlined">arrow_forward</span>
                  <span>Explore</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Topics;
