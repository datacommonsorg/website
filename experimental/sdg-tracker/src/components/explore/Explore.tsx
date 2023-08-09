import { Layout } from "antd";
import { useState } from "react";
import AppFooter from "../layout/AppFooter";
import AppHeader from "../layout/AppHeader";
import AppLayout from "../layout/AppLayout";
import AppLayoutContent from "../layout/AppLayoutContent";
import AppSidebar from "../layout/AppSidebar";
import ExploreContent from "./ExploreContent";
const Explore = () => {
  const [selectedVariableGroupDcid, setSelectedVariableGroupDcid] =
    useState<string>();
  return (
    <AppLayout>
      <AppHeader selected="explore" />
      <AppLayoutContent style={{ display: "flex", flexDirection: "column" }}>
        <Layout style={{ height: "100%", flexGrow: 1 }}>
          <AppSidebar
            setSelectedVariableGroupDcid={setSelectedVariableGroupDcid}
          />
          <Layout style={{ overflow: "auto" }}>
            <ExploreContent
              selectedVariableGroupDcid={selectedVariableGroupDcid}
            />
          </Layout>
        </Layout>
      </AppLayoutContent>
      <AppFooter />
    </AppLayout>
  );
};
export default Explore;
