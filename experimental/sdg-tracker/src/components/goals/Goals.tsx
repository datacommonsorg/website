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

import { Breadcrumb, Layout } from "antd";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import AppFooter from "../layout/AppFooter";
import AppHeader from "../layout/AppHeader";
import AppLayout from "../layout/AppLayout";
import AppLayoutContent from "../layout/AppLayoutContent";
import AppSidebar from "../layout/AppSidebar";
import GoalContent from "./GoalContent";

const Goals: React.FC = () => {
  const [selectedVariableGroupDcid, setSelectedVariableGroupDcid] =
    useState<string>();
  return (
    <AppLayout>
      <AppHeader selected="goals" />
      <AppLayoutContent style={{ display: "flex", flexDirection: "column" }}>
        <Layout style={{ height: "100%", flexGrow: 1 }}>
          <AppSidebar
            setSelectedVariableGroupDcid={setSelectedVariableGroupDcid}
          />
          <Layout style={{ padding: "0 24px 24px", overflow: "auto" }}>
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>
                <Link to="/goals">Goals</Link>
              </Breadcrumb.Item>
            </Breadcrumb>
            <GoalContent
              selectedVariableGroupDcid={selectedVariableGroupDcid}
            />
          </Layout>
        </Layout>
      </AppLayoutContent>
      <AppFooter />
    </AppLayout>
  );
};

export default Goals;
