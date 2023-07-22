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
 * Main component for DC Insights.
 */

import axios from "axios";
import React, { useEffect, useState } from "react";
import { Container } from "reactstrap";

import { getUrlToken } from "../../utils/url_utils";

/**
 * Application container
 */
export function App(): JSX.Element {
  const [chartData, setChartData] = useState<any | undefined>();

  useEffect(() => {
    const place = getUrlToken("p");
    const topic = getUrlToken("t");
    const placeType = getUrlToken("pt");
    (async () => {
      if (place && topic) {
        const charts = await fetchFulfillData(place, topic, placeType);
        setChartData(charts);
      }
    })();
  }, [window.location.hash]);

  return (
    <div className="insights-container">
      <Container>
        <h1>Insights</h1>
        <div className="insights-charts">
          # TODO: Try to generate webcomponents from charts
          <datacommons-bar
            places="geoId/06"
            variables="Count_Person"
            title="Foo Bar"
          ></datacommons-bar>
        </div>
      </Container>
    </div>
  );

const fetchFulfillData = async (
  place: string,
  topic: string,
  placeType: string
) => {
  try {
    const resp = await axios.post(`/api/nl/fulfill`, {
      entities: [place],
      variables: [topic],
      childEntityType: placeType,
    });
    return resp.data["config"];
  } catch (error) {
    console.log(error);
    return null;
  }
};
