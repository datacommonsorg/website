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
 * A component that renders the sample questions section of the home page
 */


import React, { ReactElement } from "react";
import {SampleQuestionCategory} from "../../../shared/types/homepage";

interface SampleQuestionsProps {
  //the sample question categories and questions passed from the backend through to the JavaScript via the templates
  sampleQuestions: SampleQuestionCategory[];
}

const colors = ["green", "blue", "red", "yellow", "gray"];

const SampleQuestions = ( { sampleQuestions}: SampleQuestionsProps ): ReactElement => {
  console.log(sampleQuestions);
  return (
    <section  id="sample-questions">
      <div className="container">
        <h3>Sample Questions</h3>
        <div className="questions-carousel">
          {(sampleQuestions.map((category, index) => (
            <div className="questions-column">
              {(category.questions.map((question) => (
                <div className={`question-item ${colors[index % colors.length]}`}>
                  <a href={`/explore#q=${encodeURIComponent(question)}`}>
                    <p>{question}</p>
                    <small>{category.category}</small>
                  </a>
                </div>
              )))}
            </div>
          )))}
        </div>
        <ul className="questions-carousel-dots">
          <li className="questions-carousel-dot active"><a href="#">Slide 1</a></li>
          <li className="questions-carousel-dot"><a href="#">Slide 2</a></li>
        </ul>
      </div>
    </section>
  );
};

export default SampleQuestions;