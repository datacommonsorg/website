import { Container } from "reactstrap";
import styled from "styled-components";

const FooterOuter = styled.div`
  background-color: #e9e9e9;
  padding: 3rem;
  font-size: 0.9rem;
`;

const FooterContainer = styled(Container)`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

const FooterLinks = styled.div`
  display: flex;
  a:not(:last-child) {
    margin-right: 1rem;
  }
`;
const FooterText = styled.div`
  margin-right: 1rem;
`;

const Footer = () => {
  return (
    <FooterOuter>
      <FooterContainer>
        <FooterText>
          Powered by{" "}
          <a href="https://datacommons.org" target="_blank">
            datacommons.org
          </a>
        </FooterText>
        <FooterLinks>
          <a href="https://policies.google.com/terms" target="_blank">
            Terms and Conditions
          </a>
          <a href="https://policies.google.com/privacy" target="_blank">
            Privacy Policy
          </a>
          <a href="https://datacommons.org/disclaimers" target="_blank">
            Disclaimers
          </a>
        </FooterLinks>
      </FooterContainer>
    </FooterOuter>
  );
};

export default Footer;
