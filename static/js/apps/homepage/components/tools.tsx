/**
 * Copyright 2024 Google LLC
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
 * A component that renders the tools section of the home page.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { Download } from "../../../components/elements/icons/download";
import { IntegrationInstructions } from "../../../components/elements/icons/integration_instructions";
import { Public } from "../../../components/elements/icons/public";
import { ScatterPlot } from "../../../components/elements/icons/scatter_plot";
import { Timeline } from "../../../components/elements/icons/timeline";
import { LinkIconBox } from "../../../components/elements/link_icon_box";
import { resolveHref } from "../../base/utilities/utilities";

interface ToolsProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Record<string, string>;
}

const Tools = ({ routes }: ToolsProps): ReactElement => {
  const theme = useTheme();
  return (
    <>
      <div
        css={css`
          width: 100%;
          max-width: ${theme.width.md}px;
          margin-bottom: ${theme.spacing.xl}px;
          @media (max-width: ${theme.breakpoints.md}px) {
            max-width: 100%;
          }
        `}
      >
        <h3
          css={css`
            ${theme.typography.family.heading};
            ${theme.typography.heading.md};
          `}
        >
          Data Commons tools
        </h3>
        <p
          css={css`
            ${theme.typography.family.text};
            ${theme.typography.text.lg};
          `}
        >
          Data Commons addresses offers data exploration tools and cloud-based
          APIs to access and integrate cleaned datasets.
        </p>
      </div>
      <div
        css={css`
          display: flex;
          align-items: stretch;
          flex-wrap: wrap;
          gap: ${theme.spacing.lg}px;
          margin: 0;
          padding: 0;
        `}
      >
        <LinkIconBox
          icon={<Public height={32} />}
          link={{
            id: "map",
            title: "Map Explorer",
            url: resolveHref("{tools.visualization}#visType=map", routes),
          }}
        />
        <LinkIconBox
          icon={<ScatterPlot height={32} />}
          link={{
            id: "scatter",
            title: "Scatter Plot Explorer",
            url: resolveHref("{tools.visualization}#visType=scatter", routes),
          }}
        />
        <LinkIconBox
          icon={<Timeline height={32} />}
          link={{
            id: "timeline",
            title: "Timelines Explorer",
            url: resolveHref("{tools.visualization}#visType=timeline", routes),
          }}
        />
        <LinkIconBox
          icon={<Download height={32} />}
          link={{
            id: "download",
            title: "Data Download Tool",
            url: resolveHref("{tools.download}", routes),
          }}
        />
        <LinkIconBox
          icon={<IntegrationInstructions height={32} />}
          link={{
            id: "api",
            title: "API Access",
            url: "https://docs.datacommons.org/api/",
          }}
        />
      </div>
    </>
  );
};

export default Tools;
