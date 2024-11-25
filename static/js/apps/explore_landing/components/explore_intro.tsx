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

import { IntroText } from "../../../components/content/intro_text";
import { formatNumber } from "../../../i18n/i18n";
import { TopicConfig } from "../../../shared/topic_config";

interface ExploreIntroProps {
  topic: TopicConfig;
}

export const ExploreIntro = ({ topic }: ExploreIntroProps): ReactElement => {
  return (
    <IntroText>
      <header>
        <h1>{topic.title}</h1>
        <p>
          Our {topic.title.toLocaleLowerCase()} data spans over{" "}
          <span title={`${formatNumber(topic.meta.variableCount, "", true)}`}>
            {formatNumber(topic.meta.variableCount)}
          </span>{" "}
          statistical variables. We collect our{" "}
          {topic.title.toLocaleLowerCase()} information from sources such as:{" "}
          {topic.meta.sources.map((s, i) => (
            <span key={i}>
              {topic.meta.sources.length > 1 &&
              i === topic.meta.sources.length - 1
                ? "and "
                : ""}
              {s}
              {i === topic.meta.sources.length - 1 ? "" : ", "}
            </span>
          ))}
          {"."}
        </p>
      </header>
    </IntroText>
  );
};
