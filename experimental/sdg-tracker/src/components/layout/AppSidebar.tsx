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

import { Layout, Menu } from "antd";
import SubMenu from "antd/lib/menu/SubMenu";
import { useState } from "react";
import styled from "styled-components";
import { MenuItemType, useStoreState } from "../../state";
const { Sider } = Layout;

const MenuTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 500;
  padding: 0.5rem 1.5rem;
`;

const StyledMenu = styled(Menu)`
  .ant-menu-submenu-title {
  }
  .-title-content {
    overflow: hidden;
    text-overflow: ellipsis;
    flex: auto !important;
  }
`;

const AppSidebar: React.FC<{
  variableDcid: string;
  setVariableDcid: (variableDcid: string) => void;
}> = (props) => {
  const { setVariableDcid, variableDcid } = props;
  const variableGroupHierarchy = useStoreState((s) => s.variableGroupHierarchy);
  const [siderHidden, setSiderHidden] = useState<boolean>(false);
  const getMenuItem = (item: MenuItemType) => {
    if (item.children && item.children.length > 0) {
      return (
        <SubMenu key={item.key} title={item.label} icon={item.icon}>
          {item.children.map((subItem) => getMenuItem(subItem))}
        </SubMenu>
      );
    }
    return (
      <Menu.Item key={item.key} icon={item.icon}>
        {item.label}
      </Menu.Item>
    );
  };

  return (
    <Sider
      breakpoint="lg"
      collapsedWidth="0"
      width={320}
      onBreakpoint={(broken) => {
        setSiderHidden(broken);
      }}
      style={{
        background: "white",
        overflow: !siderHidden ? "auto" : undefined,
      }}
    >
      <MenuTitle>Goals</MenuTitle>
      <StyledMenu
        defaultSelectedKeys={[variableDcid]}
        mode="inline"
        defaultOpenKeys={["1"]}
        style={{ borderRight: 0 }}
        onClick={(item) => {
          setVariableDcid(item.key.replace("summary-", ""));
        }}
      >
        {variableGroupHierarchy.map((vg) => getMenuItem(vg))}
      </StyledMenu>
    </Sider>
  );
};

export default AppSidebar;
