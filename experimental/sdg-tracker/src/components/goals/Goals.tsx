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

import { Layout } from "antd";
import React, { useCallback, useMemo } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { QUERY_PARAM_VARIABLE, ROOT_TOPIC } from "../../utils/constants";
import CountriesContent from "../countries/CountriesContent";
import AppFooter from "../layout/AppFooter";
import AppHeader from "../layout/AppHeader";
import AppLayout from "../layout/AppLayout";
import AppLayoutContent from "../layout/AppLayoutContent";
import AppSidebar from "../layout/AppSidebar";

const EARTH_PLACE_DCID = "Earth";
const Goals: React.FC = () => {
  const location = useLocation();
  const history = useHistory();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const variableDcid = searchParams.get(QUERY_PARAM_VARIABLE) || ROOT_TOPIC;

  /**
   * Update selected variable URL parameter
   */
  const setVariableDcid = useCallback(
    (variableDcid: string) => {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set(QUERY_PARAM_VARIABLE, variableDcid);
      history.push(location.pathname + "?" + searchParams.toString());
    },
    [location]
  );

  return (
    <AppLayout>
      <AppHeader selected="goals" />
      <AppLayoutContent style={{ display: "flex", flexDirection: "column" }}>
        <Layout style={{ height: "100%", flexGrow: 1, flexDirection: "row" }}>
          <AppSidebar
            variableDcid={variableDcid}
            setVariableDcid={setVariableDcid}
          />
          <Layout style={{ overflow: "auto" }}>
            <CountriesContent
              hidePlaceSearch={true}
              variableDcids={[variableDcid]}
              placeDcid={EARTH_PLACE_DCID}
              setPlaceDcid={() => {}}
            />
          </Layout>
        </Layout>
      </AppLayoutContent>
      <AppFooter />
    </AppLayout>
  );
};

export default Goals;
