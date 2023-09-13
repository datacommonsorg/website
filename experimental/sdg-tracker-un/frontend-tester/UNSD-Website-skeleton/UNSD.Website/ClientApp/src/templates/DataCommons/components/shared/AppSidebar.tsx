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

import { Layout, Menu, Spin, Tooltip } from "antd";
import SubMenu from "antd/lib/menu/SubMenu";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { MenuItemType, useStoreActions, useStoreState } from "../../state";
import { LoadingOutlined } from "@ant-design/icons";
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
    flex: auto !important;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /** 
   * Ensures tooltips are placed directly to the right of the menu instead of
   * overflowing in the middle of the page 
   */
  .-title-content span,
  .ant-menu-title-content span {
    display: block;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
  }
`;

const AppSidebar: React.FC<{
  placeDcid: string;
  variableDcid: string;
  setVariableDcid: (variableDcid: string) => void;
}> = (props) => {
  const { placeDcid, setVariableDcid, variableDcid } = props;
  const sidebarMenuHierarchy = useStoreState((s) => s.sidebarMenuHierarchy);
  const fetchPlaceSidebarMenuHierarchy = useStoreActions(
    (a) => a.fetchPlaceSidebarMenuHierarchy
  );
  const allTopicDcids = useStoreState((s) => s.allTopicDcids);
  const [placeSidebarMenuHierarchy, setPlaceSidebarMenuHierarchy] = useState<
    MenuItemType[]
  >([]);
  const [siderHidden, setSiderHidden] = useState<boolean>(false);
  const getMenuItem = (item: MenuItemType) => {
    const tagId = `${item.key.replace(/[\/\.]/g, "_")}`;
    if (item.children && item.children.length > 0) {
      return (
        <SubMenu
          className={`-dc-sidebar-submenu -dc-sidebar-submenu-${item.key}`}
          key={item.key}
          title={
            <Tooltip mouseEnterDelay={0.6} placement="right" title={item.label}>
              {item.label}
            </Tooltip>
          }
          icon={item.icon}
        >
          {item.children.map((subItem) => getMenuItem(subItem))}
        </SubMenu>
      );
    }
    return (
      <Menu.Item
        className={`-dc-sidebar-menu-item -dc-sidebar-menu-item-${item.key}`}
        key={item.key}
        icon={item.icon}
        id={tagId}
      >
        <Tooltip mouseEnterDelay={0.6} placement="right" title={item.label}>
          {item.label}
        </Tooltip>
      </Menu.Item>
    );
  };

  useEffect(() => {
    (async () => {
      const hierarchy = await fetchPlaceSidebarMenuHierarchy({
        placeDcid,
        allTopicDcids,
        sidebarMenuHierarchy,
      });
      setPlaceSidebarMenuHierarchy(hierarchy);
    })();
  }, [placeDcid, allTopicDcids, sidebarMenuHierarchy]);

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
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: !siderHidden ? "auto" : undefined,
      }}
    >
      <MenuTitle>Goals</MenuTitle>
      <StyledMenu
        selectedKeys={[variableDcid, `summary-${variableDcid}`]}
        mode="inline"
        defaultOpenKeys={["1"]}
        style={{ borderRight: 0 }}
        onClick={(item) => {
          setVariableDcid(item.key.replace("summary-", ""));
        }}
      >
        {placeSidebarMenuHierarchy.length === 0 ? (
          <Spinner />
        ) : (
          placeSidebarMenuHierarchy.map((vg) => getMenuItem(vg))
        )}
      </StyledMenu>
    </Sider>
  );
};

const Spinner = () => {
  return (
    <Spin
      indicator={
        <LoadingOutlined
          style={{
            paddingLeft: "1.5rem",
            fontSize: "1.5rem",
          }}
          spin
        />
      }
    />
  );
};

export default AppSidebar;
