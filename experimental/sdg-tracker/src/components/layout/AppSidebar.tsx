import { Layout, Menu, theme } from "antd";
import { useState } from "react";
import styled from "styled-components";
import { useStoreState } from "../../state";
const { Sider } = Layout;

const MenuTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 500;
  padding: 0.5rem 1.5rem;
`;

const AppSidebar: React.FC<{
  setSelectedVariableGroupDcid: (selectedVariableGroupDcid: string) => void;
}> = (props) => {
  const { setSelectedVariableGroupDcid } = props;
  const variableGroupHierarchy = useStoreState((s) => s.variableGroupHierarchy);
  const [siderHidden, setSiderHidden] = useState<boolean>(false);

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  return (
    <Sider
      breakpoint="lg"
      collapsedWidth="0"
      width={320}
      onBreakpoint={(broken) => {
        setSiderHidden(broken);
      }}
      style={{
        background: colorBgContainer,
        overflow: !siderHidden ? "auto" : undefined,
      }}
    >
      <MenuTitle>Goals</MenuTitle>
      <Menu
        mode="inline"
        defaultSelectedKeys={["1"]}
        defaultOpenKeys={["1"]}
        style={{ borderRight: 0 }}
        items={variableGroupHierarchy}
        onClick={(item) => {
          setSelectedVariableGroupDcid(item.key.replace("summary-", ""));
        }}
      />
    </Sider>
  );
};

export default AppSidebar;
