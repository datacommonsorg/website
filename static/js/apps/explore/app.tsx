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
 * Main component for DC Explore.
 */
import React, { useEffect } from "react";
import { Col, Container, Row } from "reactstrap";

const PAGE_ID = "explore";

interface SubTopicType {
  dcid: string;
  name: string;
}

interface TopicType {
  dcid: string;
  name: string;
  subTopics: SubTopicType[];
}

// TODO: Move this config to topics.json
const TOPICS: {
  [key: string]: TopicType[];
} = {
  health: [
    {
      dcid: "dc/topic/GlobalHealth",
      name: "Global Health",
      subTopics: [
        {
          dcid: "dc/topic/WHOHealthBehavior",
          name: "Health Behavior"
        },
        {
          dcid: "dc/topic/WHOImmunization",
          name: "Immunization"
        },
        {
          dcid: "dc/topic/WHONonCommunicableDiseases",
          name: "Non-Communicable Diseases"
        }
      ]
    },
    {
      dcid: "dc/topic/HealthConditions",
      name: "Health Conditions",
      subTopics: [
        {
          dcid: "dc/topic/Asthma",
          name: "Asthma"
        },
        {
          dcid: "dc/topic/BloodPressure",
          name: "Blood Pressure"
        },
        {
          dcid: "dc/topic/Diabetes",
          name: "Diabetes"
        },
        {
          dcid: "dc/topic/MentalHealth",
          name: "Mental Health"
        }
      ]
    },
    {
      dcid: "dc/topic/HealthEquity",
      name: "Health Equity",
      subTopics: [
        {
          dcid: "dc/topic/DisabilitiesByGender",
          name: "Disabilities by Gender"
        },
        {
          dcid: "dc/topic/DisabilitiesByRace",
          name: "Disabilities by Race"
        },
        {
          dcid: "dc/topic/HealthInsuranceByRace",
          name: "Health Insurance by Race"
        }
      ]
    },
    {
      dcid: "dc/topic/HealthInsurance",
      name: "Health Insurance",
      subTopics: [
        {
          dcid: "dc/topic/HealthInsuranceType",
          name: "Health Insurance Type"
        },
        {
          dcid: "dc/topic/NoHealthInsurance",
          name: "No Health Insurance"
        }
      ]
    },
    {
      dcid: "dc/topic/Mortality",
      name: "Mortality",
      subTopics: [
        {
          dcid: "dc/topic/CausesOfDeath",
          name: "Causes of Death"
        },
        {
          dcid: "dcid:LifeExpectancy_Person",
          name: "Life Expectancy"
        },
        {
          dcid: "dc/topic/MortalityAmongIncarcerated",
          name: "Mortality among Incarcerated"
        }
      ]
    },
    {
      dcid: "dc/topic/PreventativeHealthAndBehavior",
      name: "Preventative Health and Behavior",
      subTopics: [
        {
          dcid: "dc/topic/HealthBehavior",
          name: "Health Behavior"
        },
        {
          dcid: "dc/topic/PreventativeHealth",
          name: "Preventative Health"
        }
      ]
    }
  ]
};

/**
 * Application container
 */
export function App(): JSX.Element {
  const topic = window.location.href.split("/").pop();
  const place = "geoId/06"; // TODO: Set dynamically based on location
  const placeType = "County";
  const topicTitle = topic.charAt(0).toLocaleUpperCase() + topic.slice(1);

  const topics = TOPICS[topic];

  if (!topics) {
    return (
      <div className="explore-container">
        <Container>
          <h1>No topics found for "{topic}"</h1>
        </Container>
      </div>
    );
  }
  return (
    <div className="explore-container">
      <Container>
        <h1>{topicTitle}</h1>
        <div className="topics">
          {topics.map((t, i) => (
            <TopicContent
              key={i}
              topic={t}
              place={place}
              placeType={placeType}
            />
          ))}
        </div>
      </Container>
    </div>
  );
}

function TopicContent(props: {
  topic: TopicType;
  place: string;
  placeType: string;
}): JSX.Element {
  const { topic, place, placeType } = props;
  return (
    <Row className="topic-row">
      <Col>
        <h3>{topic.name}</h3>
        <p>
          <em className="text-muted">Topic-level chart goes here</em>
        </p>
      </Col>
      <Col>
        {topic.subTopics.map((subTopic, i) => (
          <div className="sub-topic" key={i}>
            <a
              href={`/insights#t=${encodeURIComponent(
                subTopic.dcid
              )}&p=${encodeURIComponent(place)}&pt=${encodeURIComponent(
                placeType
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {subTopic.name}
            </a>
          </div>
        ))}
      </Col>
    </Row>
  );
}
