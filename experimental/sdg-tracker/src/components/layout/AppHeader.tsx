import { gray } from "@ant-design/colors";
import { Link } from "react-router-dom";
import styled from "styled-components";

const HeaderContainer = styled.div`
  width: 100%;
  background: white;
`;

const TopContainer = styled.div`
  align-items: center;
  border-bottom: 1px solid #f1f1f1;
  display: flex;
  flex-direction: row;
  height: 75px;
  justify-content: space-between;
  padding: 0 4rem;
  width: 100%;
`;

const LogoBanner = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  .left {
    height: 35px;
    padding-right: 1.25rem;
  }
  .right {
    border-left: 2px solid grey;
    color: ${gray[7]};
    font-size: 18px;
    font-weight: bold;
    line-height: 1;
    padding-left: 1.25rem;
    text-decoration: none;
  }
`;

const LogoSecondary = styled.div`
  @media (max-width: 576px) {
    display: none;
  }
  img {
    height: 35px;
  }
`;

const HeaderNav = styled.div`
  align-items: center;
  border-bottom: 1px solid #f1f1f1;
  background-color: white !important;
  display: flex;
  flex-direction: row;
  justify-content: center;

  &:hover {
    a {
      text-decoration: none;
    }
  }
`;

const HeaderNavItem = styled.div`
  padding: 0 0.85rem;
  &:hover {
    background-color: #f8f8f8;
  }
  a {
    color: #424242;
    display: flex;
    font-size: 0.9rem;
  }
`;

const SubNavbarItemLink = styled.span<{ selected?: boolean }>`
  padding: 0.8rem 0;
  ${(p) =>
    p.selected
      ? `
      font-weight: 500;
      box-shadow: inset 0 -2px 0 #9a0000;
      color: #9a0000;
      `
      : null}
`;

const AppHeader = (props: { selected: "home" | "goals" | "explore" }) => {
  const { selected } = props;
  return (
    <HeaderContainer>
      <TopContainer>
        <LogoBanner>
          <a href="https://sdgs.un.org/" target="_blank">
            <img
              className="left"
              src="https://sdgs.un.org/themes/custom/porto/assets/images/logo-en.svg"
            />
          </a>
          <a className="right" href="https://datacommons.org" target="_blank">
            Data
            <br />
            Commons
          </a>
        </LogoBanner>
        <LogoSecondary>
          <a href="https://sdgs.un.org/goals" target="_blank">
            <img src="https://www.un.org/sustainabledevelopment/wp-content/uploads/2019/08/E_SDG_logo_without_UN_emblem_horizontal_RGB-1200x219.png" />
          </a>
        </LogoSecondary>
      </TopContainer>
      <HeaderNav>
        <HeaderNavItem>
          <Link to="/">
            <SubNavbarItemLink selected={selected === "home"}>
              Home
            </SubNavbarItemLink>
          </Link>
        </HeaderNavItem>
        <HeaderNavItem>
          <Link to="/explore">
            <SubNavbarItemLink selected={selected === "explore"}>
              Explorer
            </SubNavbarItemLink>
          </Link>
        </HeaderNavItem>
        <HeaderNavItem>
          <Link to="/goals">
            <SubNavbarItemLink selected={selected === "goals"}>
              SDG Goals
            </SubNavbarItemLink>
          </Link>
        </HeaderNavItem>
      </HeaderNav>
    </HeaderContainer>
  );
};

export default AppHeader;
