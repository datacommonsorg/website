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

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { SubjectPageSidebar } from "../../components/subject_page/sidebar";
import { SVG_CHART_HEIGHT } from "../../constants/app/nl_interface_constants";
import { getUrlToken } from "../../utils/url_utils";

const PAGE_ID = "insights";

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
        const resp = await fetchFulfillData(place, topic, placeType);
        const mainPlace = resp["place"];
        const chartData = {
          place: {
            dcid: mainPlace["dcid"],
            name: mainPlace["name"],
            types: [mainPlace["place_type"]],
          },
          config: resp["config"],
        };
        setChartData(chartData);
      }
    })();
  }, [window.location.hash]);

  return (
    <div className="insights-container">
      <Container>
        <h1>Insights</h1>
        <div className="insights-charts">
          <div className="row">
            <div className="col-md-3x col-lg-3 order-last order-lg-0">
              {chartData && chartData.config && (
                <SubjectPageSidebar
                  id={PAGE_ID}
                  categories={chartData.config.categories}
                />
              )}
            </div>
            <div className="row col-md-9x col-lg-9">
              {chartData && chartData.config && (
                <SubjectPageMainPane
                  id={PAGE_ID}
                  place={chartData.place}
                  pageConfig={chartData.config}
                  svgChartHeight={SVG_CHART_HEIGHT}
                  showExploreMore={true}
                />
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

const fetchFulfillData = async (
  place: string,
  topic: string,
  placeType: string
) => {
  try {
    const resp = await axios.post(`/api/insights/fulfill`, {
      entities: [place],
      variables: [topic],
      childEntityType: placeType,
    });
    return resp.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};
