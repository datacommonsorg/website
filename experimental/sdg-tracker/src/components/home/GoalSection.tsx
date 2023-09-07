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
import styled from "styled-components";
import { useHistory } from "react-router-dom";
import { RootTopic, useStoreState } from "../../state";
import { HomeSection } from "./components";
const HALF_TOPIC_NUM = 9;

const Container = styled(HomeSection)`
  gap: 114px;
  background-color: #F2F2F2;
`
const HeaderContainer = styled.div`
  color: #414042;
  text-align: center;
  
  .title {
    font-size: 36px;
    font-weight: 700;
    line-height: 36px;
  }

  .line-separator {
    height: 0;
    border-top: solid 3px #999;
    margin: 30px 0
  }

  .description {
    max-width: 700px;
    font-size: 22px;
    font-weight: 400;
    line-height: 36px;
  }
`
const GoalContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;

  .goal-section {
    display: grid;
    gap: 15px;
    grid-auto-rows: 1fr;
  }

  .goal-item {
    display: flex;
    align-items: stretch;
    min-height: 70px;
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
    color: #FFF;
    font-size: 24px;
    font-weight: 700;
    width: 70px;
    flex-shrink: 0;
    border-radius: 6px 0px 0px 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  } 

  .goal-name {
    color: #444;
    font-family: Roboto;
    font-size: 20px;
    font-style: normal;
    font-weight: 600;
    line-height: normal;
    padding: 0 19px;
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
`
export const GoalSection = () => {
  const history = useHistory();
  const rootTopics = useStoreState((s) => s.rootTopics);
  const goalSections = [rootTopics.slice(0, 9), rootTopics.slice(9)]

  return (
    <Container>
      <HeaderContainer>
        <div className="title">Explore SDG Data by Goal</div>
        <div className="line-separator" />
        <div className="description">Learn about SDG progress across all 17 Goals -- with data, insights and infographics in one place for a comprehensive overview.</div>
      </HeaderContainer>
      <GoalContainer>{
        goalSections.map((goalSection: RootTopic[], sectionNum) => {
          return (<div className="goal-section" key={`section-${sectionNum}`}>
          {
            goalSection.map((goal: RootTopic, topicNum) => {
              return (<div className="goal-item" key={goal.topicDcid} onClick={() => history.push(`/goals/dc/topic/sdg_1?v=${goal.topicDcid}`)}>
                <div style={{backgroundColor: goal.color}} className="goal-number">
                  <span>{HALF_TOPIC_NUM * sectionNum + topicNum + 1}</span>
                </div>
                <div className="goal-content"><div className="goal-name">{goal.name}</div><div className="goal-icon"><img src={goal.homePageIcon}/></div></div>
              </div>)
            })
          }
          {sectionNum === 1 && (
            <div className="goal-item" onClick={() => history.push("/goals")}>
            <div className="goal-number"><img src={"/images/datacommons/sdg-goals-icon.svg"}/></div>
            <div className="goal-content"><div className="goal-name">All Goals</div></div>
            </div>
          )}
          </div>)
        })
      }
      </GoalContainer>
    </Container>
  )
}