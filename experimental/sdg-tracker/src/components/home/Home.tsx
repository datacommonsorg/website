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

import { gray } from "@ant-design/colors";
import { Button, Space } from "antd";
import { Link } from "react-router-dom";
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

const HomeLinks = styled.div`
  margin: 1rem auto;
  text-align: center;
`;

const Home = () => {
  return (
    <AppLayout className="layout" style={{ minHeight: "100vh" }}>
      <Header selected="home" />
      <AppLayoutContent style={{ background: "white", overflow: "auto" }}>
        <HomeContainer>
          <h1>Sustainable Development Goals Data Commons</h1>
          <p>
            Introducing the new SDG Data Commons — a platform integrating
            authoritative SDG data and information resources from across the UN
            System into a public repository with advanced search functionality
            and a modern, user-friendly interface.
          </p>

          <HomeLinks>
            <Space>
              <Link to="/countries">
                <Button>Countries / Regions</Button>
              </Link>
              <Link to="/goals">
                <Button>Goals</Button>
              </Link>
            </Space>
          </HomeLinks>
        </HomeContainer>
      </AppLayoutContent>
      <Footer />
    </AppLayout>
  );
};

export default Home;
