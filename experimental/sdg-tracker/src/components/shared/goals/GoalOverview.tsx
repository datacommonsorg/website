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

import { ArrowRightOutlined } from "@ant-design/icons";
import { Col, Grid, Row } from "antd";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import { useStoreState } from "../../../state";
import { QUERY_PARAM_VARIABLE } from "../../../utils/constants";
import { ContentCard, ContentCardBody, ContentCardHeader } from "../components";
const { useBreakpoint } = Grid;

const ExploreLink = styled(Link)`
  .anticon {
    margin-right: 0.5rem;
  }
`;

const GoalText = styled.ul`
  margin-bottom: 2rem;
`;

const GoalImage = styled.img<{ $md?: boolean }>`
  box-shadow: 0px 0px 6px rgba(3, 7, 18, 0.03),
    0px 1px 14px rgba(3, 7, 18, 0.05);

  margin-bottom: 2rem;
  margin-right: ${(p) => (p.$md ? "2rem" : "0")};
  padding: 2rem;
  width: 100%;
`;

const StyledCol = styled(Col)`
  flex-grow: 1;
`;

const GoalOverview: React.FC<{
  goalNumber: number;
  showExploreLink?: boolean;
}> = ({ goalNumber, showExploreLink }) => {
  const goalIndex = goalNumber - 1;
  const goalSummary = useStoreState(
    (s) => s.goalSummaries.byGoal[`${goalNumber}`]
  );
  const rootTopic = useStoreState((s) => s.rootTopics[goalIndex]);
  const location = useLocation();
  const breakpoint = useBreakpoint();
  if (!goalSummary || !rootTopic) {
    return null;
  }

  const searchParams = new URLSearchParams(location.search);
  searchParams.set(QUERY_PARAM_VARIABLE, rootTopic.topicDcid);
  const exploreUrl = location.pathname + "?" + searchParams.toString();

  return (
    <ContentCard>
      <ContentCardHeader>
        <img src={rootTopic.iconUrl} />
        <h3>
          {goalNumber}: {rootTopic.name}
        </h3>
      </ContentCardHeader>
      <ContentCardBody>
        <Row>
          {goalSummary.image ? (
            <StyledCol
              md={24}
              lg={12}
            >
              <GoalImage
                src={goalSummary.image}
                $md={breakpoint.md}
              />
            </StyledCol>
          ) : null}
          <StyledCol
            md={24}
            lg={goalSummary.image ? 12 : 24}
          >
            <GoalText>
              {goalSummary.headlines.map((headline, i) => (
                <li key={i}>{headline}</li>
              ))}
            </GoalText>
          </StyledCol>
        </Row>

        {showExploreLink && (
          <p>
            <ExploreLink to={exploreUrl}>
              <ArrowRightOutlined />
              Explore Goal {goalNumber}
            </ExploreLink>
          </p>
        )}
      </ContentCardBody>
    </ContentCard>
  );
};

export default GoalOverview;
