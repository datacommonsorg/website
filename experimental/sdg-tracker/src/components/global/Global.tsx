import { Breadcrumb, Layout, Menu, theme } from "antd";
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useStoreState } from "../../state";
import AppFooter from "../layout/AppFooter";
import AppHeader from "../layout/AppHeader";
import AppLayout from "../layout/AppLayout";
import AppLayoutContent from "../layout/AppLayoutContent";
import GlobalContent from "./GlobalContent";

const { Sider } = Layout;

/**
 * Regex for matching SDG variable group names
 * By convention, these names start with a number and end with a ":"
 * Examples: "1:", "1.1.1:", "8.1:"
 */
const sdgNameRegex = /^(\d\.?[^:]*)\:/;

const MenuImageIcon = styled.img`
  width: 2rem;
  height: 2rem;
  margin-right: 0.5rem;
  border-radius: 0.25rem;
`;

const MenuTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 500;
  padding: 0.5rem 1.5rem;
`;

interface MenuItemType {
  key: string;
  label: string;
  children?: MenuItemType[];
}

const Global: React.FC = () => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const rootDcids = useStoreState((s) => s.rootDcids);
  const variableGroupsByDcid = useStoreState((s) => s.variableGroups.byDcid);
  const variablesByDcid = useStoreState((s) => s.variables.byDcid);
  const [selectedVariableGroupDcid, setSelectedVariableGroupDcid] =
    useState<string>();
  const [siderHidden, setSiderHidden] = useState<boolean>(false);

  /** Build SDG Hierarchy */
  const items = useMemo(() => {
    const traverse = (variableGroupDcid: string, iconUrl?: string): any => {
      const variableGroup = variableGroupsByDcid[variableGroupDcid];

      // We only want to include SDG goals and sub-goals in the hierarchy,
      // so filter variables & groups beyond that
      const children: MenuItemType[] = [
        ...variableGroup.childGroupDcids
          .filter((g) => sdgNameRegex.test(variableGroupsByDcid[g].name))
          .map((g) => traverse(g)),
        ...variableGroup.childVariableDcids
          .map((variableDcid) => ({
            key: variableDcid,
            label: variablesByDcid[variableDcid].name,
          }))
          .filter((obj) => sdgNameRegex.test(obj.label)),
      ];
      // Custom sort for SDG names.
      // Avoids incorrect lexicographical sort orders like  "17.10, 17.11, 17.1, 17.2"
      children.sort((a, b) => {
        const aMatch = a.label.match(sdgNameRegex);
        const bMatch = b.label.match(sdgNameRegex);
        if (aMatch && bMatch) {
          const aParts = aMatch[1].split(".");
          const bParts = bMatch[1].split(".");
          for (let i = 0; i < aParts.length; i++) {
            if (i === bParts.length) {
              return -1;
            }
            if (aParts[i] !== bParts[i]) {
              aParts[i].localeCompare(bParts[i]);
              return Number(aParts[i]) - Number(bParts[i]);
            }
          }
        }
        return a.label.localeCompare(b.label);
      });
      const item = {
        key: variableGroupDcid,
        label: variableGroup.name,
        children: children.length > 0 ? children : undefined,
        icon: iconUrl ? <MenuImageIcon src={iconUrl} /> : undefined,
      };
      return item;
    };
    const items = rootDcids.map((rootGroupDcid, i) =>
      traverse(
        rootGroupDcid,
        `https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-${
          i + 1 < 10 ? "0" : ""
        }${i + 1}.jpg`
      )
    );
    return items;
  }, [rootDcids, variableGroupsByDcid, variablesByDcid]);

  return (
    <AppLayout>
      <AppHeader selected="global" />
      <AppLayoutContent style={{ display: "flex", flexDirection: "column" }}>
        <Layout style={{ height: "100%", flexGrow: 1 }}>
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
              items={items}
              onClick={(item) => {
                setSelectedVariableGroupDcid(item.key);
              }}
            />
          </Sider>
          <Layout style={{ padding: "0 24px 24px", overflow: "auto" }}>
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>
                <Link to="/global">Global Overview</Link>
              </Breadcrumb.Item>
            </Breadcrumb>
            <GlobalContent
              selectedVariableGroupDcid={selectedVariableGroupDcid}
            />
          </Layout>
        </Layout>
      </AppLayoutContent>
      <AppFooter />
    </AppLayout>
  );
};

export default Global;
