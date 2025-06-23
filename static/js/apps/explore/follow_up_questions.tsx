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
import _ from "lodash";
import React, { ReactElement } from "react";
import axios from "axios";
import { useEffect,useState } from "react";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getUpdatedHash } from "../../utils/url_utils";
import { DEFAULT_TOPIC, URL_HASH_PARAMS } from "../../constants/app/explore_constants";

// Number of follow up questions displayed
const FOLLOW_UP_QUESTIONS_LIMIT = 10;

export interface Question {
  text: string;
  url: string;
}

export interface FollowUpQuestionsPropType {
    query: string;
    pageMetadata: SubjectPageMetadata;
}

export function FollowUpQuestions(props: FollowUpQuestionsPropType): ReactElement {

  // Gets the name of all related topics while removing the Root topic.
  const relatedTopics = []
    .concat(props.pageMetadata?.childTopics || [])
    .concat(props.pageMetadata?.peerTopics || [])
    .concat(props.pageMetadata?.parentTopics || [])
    .filter(topic => topic.dcid != DEFAULT_TOPIC || topic.name)
    .map(topic => topic.name)
    .slice(0,FOLLOW_UP_QUESTIONS_LIMIT);

  if ((_.isEmpty(relatedTopics)) || (_.isEmpty(props.query))){
    return <></>
  }

  const [followUpQuestions, setFollowUpQuestions] = useState(null);
  useEffect(() => {
    getFollowUpQuestions(props.query,relatedTopics)
    .then((value) => {
        setFollowUpQuestions(value.followUpQuestions);
    })
    .catch(() => {
        setFollowUpQuestions([]);
    });
  },[]);

  return (
    <div>
        {followUpQuestions && <div className="follow-up-questions-container">
            <div className="follow-up-questions-inner">
                <span className="follow-up-questions-title">Keep Exploring</span>
                {followUpQuestions.map((question, idx) => {
                return (
                    <div key={idx} className="follow-up-questions-list-item">
                    <a className="follow-up-questions-list-text" href={question.url}>
                        {question.text}<br></br>
                    </a>
                    </div>
                );
                })}
            </div>
        </div>}
    </div>
  );
}

// Full result from /api/explore/follow-up-questions
interface FollowUpQuestionsResult {
  followUpQuestions: Question[];

}

const getFollowUpQuestions = async (
    query:string,
    relatedTopics:string[]

): Promise<FollowUpQuestionsResult> => {
    const url = "/api/explore/follow-up-questions";
    const body = {
        q: query,
        relatedTopics: relatedTopics
    };
    return await axios.post(url, body).then((resp) => {
        const data = resp.data;
        return {
        followUpQuestions: data.follow_up_questions.map((question) => {return {text: question, url:`/explore/#${getUpdatedHash({
                  [URL_HASH_PARAMS.QUERY]: question,
                })}`}})
        };
    });
}