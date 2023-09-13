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
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { RootTopic, useStoreState } from "../../state";
import { HomeSection, SectionDescription, SectionHeader } from "./components";
const HALF_TOPIC_NUM = 9;

const Container = styled(HomeSection)`
  gap: 36px;
  background-color: #f2f2f2;
`;

const HeaderContainer = styled.div`
  color: #414042;
  text-align: center;

  .line-separator {
    height: 0;
    border-top: solid 2px #999;
    margin: 21px 0;
  }
`;

const GoalContainerOuter = styled.div`
    width: 100%;
    max-width: 1065px;
    display: flex;
    justify-content: center;
`

const GoalContainer = styled.div`
  display: grid;
  grid-auto-rows: 1fr;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 15px;
  width: fit-content;
  max-width: 100%;

  .goal-section {
    display: grid;
    gap: 15px;
    grid-auto-rows: 1fr;
    height: 100%;
  }

  .goal-item {
    display: flex;
    align-items: stretch;
    min-height: 60px;
    border-radius: 6px;
    cursor: pointer;
    max-width: 525px;
    width: 100%;
    background-color: #fff;
  }

  .goal-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-grow: 1;
    height: 100%;
    padding: 10px 0;
  }

  .goal-number {
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    width: 60px;
    flex-shrink: 0;
    border-radius: 6px 0px 0px 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .goal-name {
    color: #444;
    font-family: Roboto;
    font-size: 16px;
    font-style: normal;
    font-weight: 600;
    line-height: normal;
    padding: 0 16px;
    word-wrap: break-word;
  }

  .goal-icon {
    width: 116px;
    height: 45px;
    border-left: solid 1px #999;
    display: flex;
    justify-content: center;
    flex-shrink: 0;
    align-items: center;

    img {
      height: fit-content;
    }
  }
`;
export const GoalSection = () => {
  const history = useHistory();
  const rootTopics = useStoreState((s) => s.rootTopics);
  const goalSections = [rootTopics.slice(0, 9), rootTopics.slice(9)];

  return (
    <Container>
      <HeaderContainer>
        <SectionHeader>Explore SDG Data by Goal</SectionHeader>
        <div className="line-separator" />
        <SectionDescription>
          Learn about SDG progress in a one-stop hub with data, insights and
          infographics for a comprehensive overview across all 17 Goals.
      </SectionDescription>
      </HeaderContainer>
      <GoalContainerOuter>
        <GoalContainer>
          {goalSections.map((goalSection: RootTopic[], sectionNum) => {
            return (
              <div className="goal-section" key={`section-${sectionNum}`}>
                {goalSection.map((goal: RootTopic, topicNum) => {
                  return (
                    <div
                      className={`goal-item -dc-goal-item-${topicNum + 1}`}
                      key={goal.topicDcid}
                      onClick={() =>
                        history.push(`/goals/dc/topic/sdg_1?v=${goal.topicDcid}`)
                      }
                    >
                      <div
                        style={{ backgroundColor: goal.color }}
                        className="goal-number"
                      >
                        <span>{HALF_TOPIC_NUM * sectionNum + topicNum + 1}</span>
                      </div>
                      <div className="goal-content">
                        <div className="goal-name">{goal.name}</div>
                        <div className="goal-icon">
                          <img src={goal.homePageIcon} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {sectionNum === 1 && (
                  <div
                    className="goal-item -dc-goal-item-all"
                    onClick={() => history.push("/goals")}
                  >
                    <div className="goal-number">
                      <img src={"./images/datacommons/sdg-goals-icon.svg"} />
                    </div>
                    <div className="goal-content">
                      <div className="goal-name">All Goals</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </GoalContainer>
      </GoalContainerOuter>
    </Container>
  );
};
