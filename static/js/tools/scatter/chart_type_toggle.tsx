/**
 * Copyright 2025 Google LLC
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
 * Toggle for selecting the chart type for the scatter tool
 */

import { css, useTheme } from "@emotion/react";
import React, { useContext } from "react";

import { Button } from "../../components/elements/button/button";
import { Public } from "../../components/elements/icons/public";
import { ScatterPlot } from "../../components/elements/icons/scatter_plot";
import { Tooltip } from "../../components/elements/tooltip/tooltip";
import { intl } from "../../i18n/i18n";
import { toolMessages } from "../../i18n/i18n_tool_messages";
import { Context } from "./context";
import { ScatterChartType } from "./util";

export function ChartTypeToggle(): JSX.Element {
  const { display } = useContext(Context);
  const theme = useTheme();

  return (
    <div
      css={css`
        border-radius: 0.25rem;
        border: 1px solid ${theme.colors.border.primary.light};
        display: flex;
        flex-direction: row;
        flex-shrink: 0;
        flex-wrap: nowrap;
        overflow: hidden;
        width: fit-content;
      `}
    >
      <Tooltip
        title={intl.formatMessage(
          toolMessages.scatterToolScatterChartTypeTooltip
        )}
      >
        <Button
          id="scatter-chart-type-selector-scatter"
          variant={
            display.chartType === ScatterChartType.SCATTER ? "flat" : "text"
          }
          onClick={(): void => display.setChartType(ScatterChartType.SCATTER)}
          startIcon={<ScatterPlot />}
          css={css`
            border-radius: 0.25rem;
          `}
        />
      </Tooltip>
      <Tooltip
        title={intl.formatMessage(
          toolMessages.scatterToolBivariateChartTypeTooltip
        )}
      >
        <Button
          id="scatter-chart-type-selector-map"
          variant={display.chartType === ScatterChartType.MAP ? "flat" : "text"}
          onClick={(): void => display.setChartType(ScatterChartType.MAP)}
          startIcon={<Public />}
          css={css`
            border-radius: 0.25rem;
          `}
        />
      </Tooltip>
    </div>
  );
}
