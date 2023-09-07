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
import Footer from "../shared/AppFooter";
import Header from "../shared/AppHeader";
import AppLayout from "../shared/AppLayout";
import AppLayoutContent from "../shared/AppLayoutContent";
import { ExploreSection } from "./ExploreSection";
import { GoalSection } from "./GoalSection";
import { PlaceSection } from "./PlaceSection";
import { HomeSection } from "./components";

const HomeContainer = styled(HomeSection)`
  gap: 64px;
  background-color: #f2f2f2;

  .page-header {
    display: flex;
    align-items: center;
    width: 100%;
    max-width: 627px;

    img {
      width: 100%;
    }
  }
  p {
    color: #414042;
    text-align: center;
    font-family: Roboto;
    font-size: 26px;
    font-weight: 400;
    line-height: 42px;
    max-width: 886px;
    margin-bottom: 0;
  }
`;

const Home = () => {
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
          <div className="page-header">
            <img src={"/images/datacommons/un-dc-sdg-logo.png"} />
          </div>
          <p>
            Introducing the new SDG Data Commons — a platform integrating
            authoritative SDG data and information resources from across the UN
            System into a public repository with advanced search functionality
            and a modern, user-friendly interface.
          </p>
        </HomeContainer>
        <PlaceSection />
        <GoalSection />
        <ExploreSection />
      </AppLayoutContent>
      <Footer />
    </AppLayout>
  );
};

export default Home;
