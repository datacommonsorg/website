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
  margin: auto;
  text-align: center;
`;

const Home = () => {
  return (
    <AppLayout className="layout" style={{ minHeight: "100vh" }}>
      <Header selected="home" />
      <AppLayoutContent style={{ background: "white" }}>
        <HomeContainer>
          <h1>
            Use Google's Data Commons to explore United Nations Sustainable
            Development Goals
          </h1>
          <p>
            Discover the progress made towards the United Nations{" "}
            <a
              href="https://sdgs.un.org/"
              target="_blank"
              rel="noreferrer noopener"
            >
              Sustainable Development Goals (SDGs)
            </a>
            . Access accurate and up-to-date information, interactive
            visualizations, and insightful analysis, empowering you to drive
            positive change towards a sustainable future for all.
          </p>
          <HomeLinks>
            <Space>
              <Link to="/global">
                <Button size="large">Global Overview</Button>
              </Link>
              <Link to="/country">
                <Button size="large">Country View</Button>
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
