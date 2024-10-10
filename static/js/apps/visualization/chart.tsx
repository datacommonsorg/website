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

/**
 * Component that draws a chart based off the state of the visualization tool.
 */
import React, { useContext, useRef, useState } from "react";

import { STAT_VAR_SELECTOR_WIDTH } from "../../constants/tools_constants";
import { DrawerResize } from "../../stat_var_hierarchy/drawer_resize";
import { AppContext } from "./app_context";
import { StatVarSelector } from "./stat_var_selector";
import { VIS_TYPE_CONFIG } from "./vis_type_configs";

export function Chart(): JSX.Element {
  const appContext = useContext(AppContext);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(STAT_VAR_SELECTOR_WIDTH);
  const sidebarRef = useRef<HTMLDivElement>();

  const chartHeight = window.innerHeight * 0.45;
  const visTypeConfig = VIS_TYPE_CONFIG[appContext.visType];
  const footer = visTypeConfig.getFooter ? visTypeConfig.getFooter() : "";

  return (
    <div className="chart-section">
      <div
        className={`stat-var-selector-area ${isCollapsed ? "collapsed" : ""}`}
        ref={sidebarRef}
        style={{ width: isCollapsed ? undefined : width }}
      >
        <div id="stat-var-selector-content">
          <div className="section-title">Variables</div>
          <StatVarSelector hidden={isCollapsed} />
        </div>

        <DrawerResize
          collapsible={true}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          setWidth={setWidth}
          sidebarRef={sidebarRef}
        />
      </div>
      <div className="chart-area">
        {visTypeConfig.getChartArea(appContext, chartHeight)}
        {footer && <div className="footer">{footer}</div>}
      </div>
    </div>
  );
}
