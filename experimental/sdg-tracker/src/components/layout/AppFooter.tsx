import { Layout } from "antd";
import styled from "styled-components";

const Byline = styled.div`
  .text {
    font-size: 0.75em;
    font-weight: 400;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .logo {
    margin-left: 0.3em;
    margin-top: -0.2em;
    height: 1.4em;
  }
`;

const AppFooter = () => {
  return (
    <Layout.Footer>
      Powered by Google's{" "}
      <a
        href="https://datacommons.org"
        target="_blank"
        rel="noopener noreferrer"
      >
        Data Commons
      </a>
    </Layout.Footer>
  );
};

export default AppFooter;
