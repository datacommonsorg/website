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
 * A component that renders the topics section of the home page.
 */

import React, { ReactElement } from "react";

import { Topic } from "../../shared/types/homepage";

interface TopicsProps {
  //the topics passed from the backend through to the JavaScript via the templates
  topics: Topic[];
}

const Topics = ({ topics }: TopicsProps): ReactElement => {
  return (
    <section id="topics">
      <div className="container">
        <h3>Topics to explore</h3>
        <ul className="topics-container">
          {topics.map((topic) => (
            <li key={topic.id} className="topic-item">
              <a
                href={topic.browseUrl}
                onClick={(): void => {
                  window.location.href = topic.browseUrl;
                }}
              >
                <span className="material-icons-outlined">arrow_forward</span>
                {topic.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Topics;
