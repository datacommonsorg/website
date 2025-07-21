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
import { useInView } from "react-intersection-observer";

import { Loading } from "../../components/elements/loading";
import { URL_HASH_PARAMS } from "../../constants/app/explore_constants";
import { FOLLOW_UP_QUESTIONS_GA } from "../../shared/feature_flags/util";
import {
  GA_EVENT_FOLLOW_UP_QUESTIONS_VIEW,
  GA_EVENT_RELATED_TOPICS_CLICK,
  GA_PARAM_RELATED_TOPICS_MODE,
  GA_VALUE_RELATED_TOPICS_DISPLAY_QUESTIONS,
  triggerGAEvent,
} from "../../shared/ga_events";
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
  const [followUpQuestions, setFollowUpQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const { ref: inViewRef } = useInView({
    triggerOnce: true,
    rootMargin: "0px",
    onChange: (inView) => {
      if (inView) {
        onComponentInitialView();
      }
    },
  });
  useEffect(() => {
    // Gets the name of all related topics while removing the Root topic.
    // Empty string can be passed since only the topic name will be used, which is stored in the property `text`.
    const relatedTopics = getTopics(props.pageMetadata, "")
      .map((topic) => topic.text)
      .slice(0, FOLLOW_UP_QUESTIONS_LIMIT);
    getFollowUpQuestions(props.query, relatedTopics)
      .then((value) => {
        setFollowUpQuestions(value);
      })
      .catch(() => {
        setFollowUpQuestions([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [props.query, props.pageMetadata]);

  return (
    <div ref={inViewRef}>
      {loading && (
        <div className="loading-container">
          <Loading />
        </div>
      )}
      {!loading && !_.isEmpty(followUpQuestions) && (
        <div className="follow-up-questions-container">
          <div className="follow-up-questions-inner">
            <span className="follow-up-questions-title">Keep exploring</span>
            {followUpQuestions.map((question, idx) => {
              return (
                <div key={idx} className="follow-up-questions-list-item">
                  <a
                    className="follow-up-questions-list-text"
                    href={question.url}
                    onClick={(): void => onQuestionClicked()}
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

// Gets followup questions from the /api/explore/follow-up-questions endpoint and processes the response
const getFollowUpQuestions = async (
  query: string,
  relatedTopics: string[]
): Promise<Question[]> => {
  if (_.isEmpty(query) || _.isEmpty(relatedTopics)) {
    return [];
  }
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
        url: `/explore/?enable_feature=${FOLLOW_UP_QUESTIONS_GA}#${getUpdatedHash(
          {
            [URL_HASH_PARAMS.QUERY]: question,
          }
        )}`,
      };
    });
  });
};

const onQuestionClicked = (): void => {
  triggerGAEvent(GA_EVENT_RELATED_TOPICS_CLICK, {
    [GA_PARAM_RELATED_TOPICS_MODE]: GA_VALUE_RELATED_TOPICS_DISPLAY_QUESTIONS,
  });
};

const onComponentInitialView = (): void => {
  triggerGAEvent(GA_EVENT_FOLLOW_UP_QUESTIONS_VIEW, {});
};
