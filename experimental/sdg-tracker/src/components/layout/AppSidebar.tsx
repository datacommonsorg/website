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
