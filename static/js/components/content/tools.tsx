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
 * A component that renders a list of available tools.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement, ReactNode } from "react";

import { resolveHref } from "../../apps/base/utilities/utilities";
import { Download } from "../elements/icons/download";
import { IntegrationInstructions } from "../elements/icons/integration_instructions";
import { Public } from "../elements/icons/public";
import { ScatterPlot } from "../elements/icons/scatter_plot";
import { Timeline } from "../elements/icons/timeline";
import { LinkIconBox } from "../elements/link_icon_box";

export type Tool =
  | "statVarExplorer"
  | "map"
  | "scatter"
  | "timeline"
  | "download"
  | "api";

interface ToolsProps {
  // a list of tools to include; if left undefined, all tools are included.
  tools?: Tool[];
  // the routes dictionary - this is used to convert routes to resolved urls.
  routes: Record<string, string>;
  // className for styling / Emotion's styled.
  className?: string;
  // whether to include descriptions for each item; defaults to false.
  showDescriptions?: boolean;
  // content displayed above the tools is passed in as the children.
  children?: ReactNode;
}

export const Tools = ({
  tools,
  routes,
  className,
  showDescriptions = false,
  children,
}: ToolsProps): ReactElement => {
  const theme = useTheme();

  const toolMap: Record<
    Tool,
    {
      icon: React.JSX.Element;
      link: {
        id: string;
        title: string;
        url: string;
        description: string;
      };
    }
  > = {
    statVarExplorer: {
      icon: <IntegrationInstructions height={32} />,
      link: {
        id: "stat-var-explorer",
        title: "Statistical Variable Explorer",
        url: resolveHref("{tools.stat_var}", routes),
        description:
          "Explorer statistical variable details including metadata and observations",
      },
    },
    map: {
      icon: <Public height={32} />,
      link: {
        id: "map",
        title: "Map Explorer",
        url: resolveHref("{tools.visualization}#visType=map", routes),
        description:
          "See how selected statistical variables vary across geographic regions",
      },
    },
    scatter: {
      icon: <ScatterPlot height={32} />,
      link: {
        id: "scatter",
        title: "Scatter Plot Explorer",
        url: resolveHref("{tools.visualization}#visType=scatter", routes),
        description:
          "Visualize the correlation between two statistical variables",
      },
    },
    timeline: {
      icon: <Timeline height={32} />,
      link: {
        id: "timeline",
        title: "Timelines Explorer",
        url: resolveHref("{tools.visualization}#visType=timeline", routes),
        description: "See trends over time for selected statistical variables",
      },
    },
    download: {
      icon: <Download height={32} />,
      link: {
        id: "download",
        title: "Data Download Tool",
        url: resolveHref("{tools.download}", routes),
        description: "Download data for selected statistical variables",
      },
    },
    api: {
      icon: <IntegrationInstructions height={32} />,
      link: {
        id: "api",
        title: "API Access",
        url: "https://docs.datacommons.org/api/",
        description: "Access Data Commons data programmatically using our APIs",
      },
    },
  };

  const toolsToDisplay = tools === undefined ? Object.keys(toolMap) : tools;

  const hasChildren = React.Children.count(children) > 0;

  return (
    <div
      className={className}
      css={css`
        width: 100%;

        & > header {
          width: 100%;
          max-width: ${theme.width.sm}px;
          margin-bottom: ${theme.spacing.xl}px;
          @media (max-width: ${theme.breakpoints.md}px) {
            max-width: 100%;
          }
          & > h3 {
            ${theme.typography.family.heading};
            ${theme.typography.heading.md};
            margin-bottom: ${theme.spacing.xl}px;
          }
          & > p {
            ${theme.typography.family.text};
            ${theme.typography.text.lg};
          }
        }

        & > .tools {
          display: flex;
          align-items: stretch;
          flex-wrap: wrap;
          gap: ${theme.spacing.lg}px;
          margin: 0;
          padding: 0;
        }
      `}
    >
      {hasChildren && <header>{children}</header>}
      <div className="tools">
        {toolsToDisplay.map((toolId) => {
          const tool = toolMap[toolId];
          return (
            <LinkIconBox
              key={toolId}
              icon={tool.icon}
              link={tool.link}
              description={showDescriptions ? tool.link.description : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};
