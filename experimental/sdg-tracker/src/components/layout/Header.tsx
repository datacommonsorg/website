import styled from "styled-components";
import { Navbar } from "reactstrap";

const SubNavbar = styled.div`
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

const SubNavbarItem = styled.div`
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

const TopNavbarBrand = styled.a`
  color: rgba(0, 0, 0, 0.9);
  &:hover {
    color: rgba(0, 0, 0, 0.9);
  }
  font-family: "Museo Sans Rounded", sans-serif;
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: 0.01rem;
  display: flex;
  justify-content: center;
`;

const TopNavbar = styled(Navbar)`
  align-items: center;
  border-bottom: 1px solid #f1f1f1;
  background-color: white !important;
  height: 80px;
}`;

const TopNavbarContainer = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0;
`;

const Header = () => {
  return (
    <>
      <TopNavbar className="navbar navbar-expand-lg navbar-light bg-light">
        <TopNavbarContainer className="container">
          <TopNavbarBrand className="navbar-brand" href="/">
            Sustainable Development Goals Tracker
          </TopNavbarBrand>
        </TopNavbarContainer>
      </TopNavbar>
      <SubNavbar>
        <SubNavbarItem>
          <a href="">
            <SubNavbarItemLink selected={true}>Global Overview</SubNavbarItemLink>
          </a>
        </SubNavbarItem>
        <SubNavbarItem>
          <a href="">
            <SubNavbarItemLink>Country View</SubNavbarItemLink>
          </a>
        </SubNavbarItem>
      </SubNavbar>
    </>
  );
};

export default Header;
