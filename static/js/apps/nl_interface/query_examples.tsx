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
 * Component for a list of example queries
 */

import _ from "lodash";
import React from "react";

import { getUrlToken } from "../../utils/url_utils";

// Map of topic to list of example queries
const TOPIC_QUERIES = {
  agriculture: [
    "What are the primary crops grown in California",
    "What is the main farming method used in USA",
    "How does the agriculture industry contribute to the economy of the region",
  ],
  education: [
    "What population of females have their bachelors degree across states in USA",
    "What population of males have their masters degree in California",
    "On average, what is the highest educational attainment for the population of USA",
  ],
  demographics: [
    "What is the median age of counties in the US",
    "What is the population of countries in the world",
    "What is the female population vs male population in the world",
  ],
  crime: [
    "What are the major types of crime prevalent in New York City",
    "What are the crime rates of all the countries in the world",
    "How do crime rates in the US compare to other countries",
  ],
  environment: [
    "What are the water withdrawal rates of states across the US",
    "What counties in California have the highest annual greenhouse gas emissions",
    "What are the projected temperatures in USA",
  ],
  economy: [
    "What is the household income of US states",
    "What is the individual income of US states",
    "What is the unemployment rate in the world",
  ],
  housing: [
    "How do housing prices in California compare with New York",
    "What percentage of homes are rentals in USA",
    "How old are the homes in counties in USA",
  ],
  sustainability: [
    "Where were there fires in the US in the last year",
    "What is the projected max temperature across the world",
    "How does air pollution correlate with asthma prevalence around the world",
  ],
  biomedical: [
    "What is the prevalence of heart disease in Texas",
    "How does the prevalence of heart disease correlate with projected temperatures in the US",
    "What is the prevalence of asthma in Asia",
  ],
};

interface QueryExamplesPropType {
  // Callback function for exmple item clicks.
  onItemClick: (queries: string[]) => void;
}

export function QueryExamples(props: QueryExamplesPropType): JSX.Element {
  const topic = getUrlToken("topic");
  if (!topic || !TOPIC_QUERIES[topic]) {
    return null;
  }
  const examples = TOPIC_QUERIES[topic];
  return (
    <div className="container nl-examples">
      <h3>Try one of these queries</h3>
      <div className="examples-container">
        {examples.map((query, i) => {
          return (
            <div
              className="example-item"
              key={i}
              onClick={() => props.onItemClick([query])}
              title={query}
            >
              {query}
            </div>
          );
        })}
      </div>
    </div>
  );
}
