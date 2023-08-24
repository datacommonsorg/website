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

import { blue, gray, orange } from "@ant-design/colors";
import {
  CompassOutlined,
  FileSearchOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import Footer from "../layout/AppFooter";
import Header from "../layout/AppHeader";
import AppLayout from "../layout/AppLayout";
import AppLayoutContent from "../layout/AppLayoutContent";

const HomeContainer = styled.div`
  margin: 4rem auto;
  padding: 0 2rem;
  h1 {
    font-size: 2.5rem;
    font-weight: 400;
    margin: auto;
    margin-bottom: 2rem;
    text-align: center;
    max-width: 600px;
  }
  p {
    font-size: 1rem;
    font-weight: 500;
    margin: auto;
    margin-bottom: 1.5rem;
    max-width: 600px;
    text-align: center;
  }
  .subtext {
    margin: auto;
    max-width: 600px;
    text-align: center;
    font-size: 0.8rem;
    font-weight: 600px;
    color: ${gray[4]};
  }
`;

const CardSection = styled.div`
  align-items: center;
  flex-grow: 1;
  background-color: #f7f7f7;
  display: flex;
  flex-direction: column;
  padding: 4rem 0 6rem;
  h3 {
    font-size: 1.75rem;
    font-weight: 300;
    text-align: center;
    margin-bottom: 5rem;
  }
`;
const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 4rem;
  justify-content: center;
`;

const StyledCard = styled.div`
  background: white;
  border: 1px solid #ececec;
  width: 280px;
  height: 280px;
  cursor: pointer;
  padding: 1.5rem;
  text-align: center;
  .icon {
    font-size: 2rem;
    color: ${blue[2]};
    margin-bottom: 2rem;
  }
  .title {
    color: ${orange[6]};
    font-size: 1.1rem;
    font-weight: 500;
    margin-bottom: 1rem;
  }
  .body {
    font-size: 1rem;
    line-height: 1.25rem;
    color: #5f5f5f;
  }
  &:hover {
    cursor: pointer;
    box-shadow: 0px 1px 3px rgba(3, 7, 18, 0.02),
      0px 4px 13px rgba(3, 7, 18, 0.03), 0px 10px 30px rgba(3, 7, 18, 0.05);
  }
`;

const Home = () => {
  const history = useHistory();
  const location = useLocation();
  return (
    <AppLayout className="layout" style={{ minHeight: "100vh" }}>
      <Header selected="home" />
      <AppLayoutContent
        style={{
          background: "white",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <HomeContainer>
          <h1>Sustainable Development Goals Data Commons</h1>
          <p>
            Introducing the new SDG Data Commons — a platform integrating
            authoritative SDG data and information resources from across the UN
            System into a public repository with advanced search functionality
            and a modern, user-friendly interface.
          </p>
        </HomeContainer>
        <CardSection>
          <h3>Understanding through Data</h3>
          <CardContainer>
            <StyledCard
              onClick={() => {
                history.push("/countries");
              }}
            >
              <div className="icon">
                <CompassOutlined />
              </div>
              <div className="title">Countries and Regions</div>
              <div className="body">
                Learn about countries' and regions' progress on UN's SDGs
                through Google's Data Commons.
              </div>
            </StyledCard>
            <StyledCard
              onClick={() => {
                history.replace("/goals");
              }}
            >
              <div className="icon">
                <LineChartOutlined />
              </div>
              <div className="title">Global Progress</div>
              <div className="body">
                Visualize global advancements, gaining a holistic perspective on
                our journey to a better future.
              </div>
            </StyledCard>
            <StyledCard
              onClick={() => {
                history.replace("/search");
              }}
            >
              <div className="icon">
                <FileSearchOutlined />
              </div>
              <div className="title">Search</div>
              <div className="body">
                Search all SDG goals, topics, and indicators world-wide using
                Data Commons' knowledge graph.
              </div>
            </StyledCard>
          </CardContainer>
        </CardSection>
      </AppLayoutContent>
      <Footer />
    </AppLayout>
  );
};

export default Home;
