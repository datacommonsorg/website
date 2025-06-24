/**
 * Copyright 2025 Google LLC
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
 * Component for rendering the generated follow up questions.
 */
import axios from "axios";
import _ from "lodash";
import React, { ReactElement, useEffect, useState } from "react";

import {
  DEFAULT_TOPIC,
  URL_HASH_PARAMS,
} from "../../constants/app/explore_constants";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getTopics } from "../../utils/app/explore_utils";
import { getUpdatedHash } from "../../utils/url_utils";

// Number of follow up questions displayed
const FOLLOW_UP_QUESTIONS_LIMIT = 10;

interface Question {
  text: string;
  url: string;
}

interface FollowUpQuestionsPropType {
  query: string;
  pageMetadata: SubjectPageMetadata;
}

export function FollowUpQuestions(
  props: FollowUpQuestionsPropType
): ReactElement {
  // Gets the name of all related topics while removing the Root topic.
  // Empty string can be passed since only the topic name will be used, which is stored in the property `text`.
  const relatedTopics = getTopics(props.pageMetadata, "")
    .map((topic) => topic.text)
    .slice(0, FOLLOW_UP_QUESTIONS_LIMIT);

  if (_.isEmpty(relatedTopics) || _.isEmpty(props.query)) {
    return <></>;
  }

  const [followUpQuestions, setFollowUpQuestions] = useState(null);
  useEffect(() => {
    getFollowUpQuestions(props.query, relatedTopics)
      .then((value) => {
        setFollowUpQuestions(value);
      })
      .catch(() => {
        setFollowUpQuestions([]);
      });
  }, []);

  return (
    <div>
      {followUpQuestions && (
        <div className="follow-up-questions-container">
          <div className="follow-up-questions-inner">
            <span className="follow-up-questions-title">Keep Exploring</span>
            {followUpQuestions.map((question, idx) => {
              return (
                <div key={idx} className="follow-up-questions-list-item">
                  <a
                    className="follow-up-questions-list-text"
                    href={question.url}
                  >
                    {question.text}
                    <br></br>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

//  Parses request from /api/explore/follow-up-questions by creating a
//  url with the generated question as the query.
const getFollowUpQuestions = async (
  query: string,
  relatedTopics: string[]
): Promise<Question[]> => {
  const url = "/api/explore/follow-up-questions";
  const body = {
    q: query,
    relatedTopics,
  };
  return await axios.post(url, body).then((resp) => {
    const data = resp.data;
    return data.follow_up_questions.map((question) => {
      return {
        text: question,
        url: `/explore/#${getUpdatedHash({
          [URL_HASH_PARAMS.QUERY]: question,
        })}`,
      };
    });
  });
};
