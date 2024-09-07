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

const SampleQuestions = (): ReactElement => {
  return (
    <section  id="sample-questions">
      <div className="container">
        <h3>Sample Questions</h3>
        <div className="questions-carousel">
          <div className="questions-column">
            <div className="question-item green">
              <a href="#">
                <p>Which counties in the US have the most smoke pollution?</p>
                <small>Sustainabilty</small>
              </a>
            </div>
            <div className="question-item green">
              <a href="#">
                <p>Show me the breakdown of businesses by industry type in the US</p>
                <small>Sustainabilty</small>
              </a>
            </div>
            <div className="question-item green">
              <a href="#">
                <p>Which counties in the US have the most smoke pollution?</p>
                <small>Sustainabilty</small>
              </a>
            </div>
          </div>
          <div className="questions-column">
            <div className="question-item blue">
              <a href="#">
                <p>Which counties in the US have the most smoke pollution?</p>
                <small>Sustainabilty</small>
              </a>
            </div>
            <div className="question-item blue">
              <a href="#">
                <p>Show me the breakdown of businesses by industry type in the US</p>
                <small>Sustainabilty</small>
              </a>
            </div>
            <div className="question-item blue">
              <a href="#">
                <p>Which counties in the US have the most smoke pollution?</p>
                <small>Sustainabilty</small>
              </a>
            </div>
          </div>
          <div className="questions-column">
            <div className="question-item red">
              <a href="#">
                <p>Which counties in the US have the most smoke pollution?</p>
                <small>Sustainabilty</small>
              </a>
            </div>
            <div className="question-item red">
              <a href="#">
                <p>Show me the breakdown of businesses by industry type in the US</p>
                <small>Sustainabilty</small>
              </a>
            </div>
            <div className="question-item red">
              <a href="#">
                <p>Which counties in the US have the most smoke pollution?</p>
                <small>Sustainabilty</small>
              </a>
            </div>
          </div>
          <div className="questions-column">
            <div className="question-item yellow">
              <a href="#">
                <p>Which counties in the US have the most smoke pollution?</p>
                <small>Sustainabilty</small>
              </a>
            </div>
            <div className="question-item yellow">
              <a href="#">
                <p>Show me the breakdown of businesses by industry type in the US</p>
                <small>Sustainabilty</small>
              </a>
            </div>
            <div className="question-item yellow">
              <a href="#">
                <p>Which counties in the US have the most smoke pollution?</p>
                <small>Sustainabilty</small>
              </a>
            </div>
          </div>
          <div className="questions-column">
            <div className="question-item gray">
              <a href="#">
                <p>Which counties in the US have the most smoke pollution?</p>
                <small>Sustainabilty</small>
              </a>
            </div>
            <div className="question-item gray">
              <a href="#">
                <p>Show me the breakdown of businesses by industry type in the US</p>
                <small>Sustainabilty</small>
              </a>
            </div>
            <div className="question-item gray">
              <a href="#">
                <p>Which counties in the US have the most smoke pollution?</p>
                <small>Sustainabilty</small>
              </a>
            </div>
          </div>
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