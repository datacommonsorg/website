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
 * A component that renders a list of available tools.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement, ReactNode, useMemo } from "react";

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

// An icon map for all the possible different tools
const ICONS = {
  statVarExplorer: <IntegrationInstructions height={32} />,
  map: <Public height={32} />,
  scatter: <ScatterPlot height={32} />,
  timeline: <Timeline height={32} />,
  download: <Download height={32} />,
  api: <IntegrationInstructions height={32} />,
};

export const Tools = ({
  tools,
  routes,
  className,
  showDescriptions = false,
  children,
}: ToolsProps): ReactElement => {
  const theme = useTheme();

  const toolList = useMemo(() => {
    const allTools: Record<
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
        icon: ICONS.statVarExplorer,
        link: {
          id: "stat-var-explorer",
          title: "Statistical Variable Explorer",
          url: resolveHref("{tools.stat_var}", routes),
          description:
            "Explorer statistical variable details including metadata and observations",
        },
      },
      map: {
        icon: ICONS.map,
        link: {
          id: "map",
          title: "Map Explorer",
          url: resolveHref("{tools.visualization}#visType=map", routes),
          description:
            "See how selected statistical variables vary across geographic regions",
        },
      },
      scatter: {
        icon: ICONS.scatter,
        link: {
          id: "scatter",
          title: "Scatter Plot Explorer",
          url: resolveHref("{tools.visualization}#visType=scatter", routes),
          description:
            "Visualize the correlation between two statistical variables",
        },
      },
      timeline: {
        icon: ICONS.timeline,
        link: {
          id: "timeline",
          title: "Timelines Explorer",
          url: resolveHref("{tools.visualization}#visType=timeline", routes),
          description:
            "See trends over time for selected statistical variables",
        },
      },
      download: {
        icon: ICONS.download,
        link: {
          id: "download",
          title: "Data Download Tool",
          url: resolveHref("{tools.download}", routes),
          description: "Download data for selected statistical variables",
        },
      },
      api: {
        icon: ICONS.api,
        link: {
          id: "api",
          title: "API Access",
          url: "https://docs.datacommons.org/api/",
          description:
            "Access Data Commons data programmatically using our APIs",
        },
      },
    };
    const displayedToolKeys = tools || Object.keys(allTools);

    return displayedToolKeys.map((key) => allTools[key]);
  }, [routes, tools]);

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
            color: ${theme.colors.text.primary.base};
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

        & > .tools .link-title {
          color: ${theme.colors.link.primary.base};
        }
        & > .tools .link-description {
          ${theme.typography.family.text};
          ${theme.typography.text.sm};
          color: ${theme.colors.text.primary.base};
        }
      `}
    >
      {hasChildren && <header>{children}</header>}
      <div className="tools">
        {toolList.map((tool) => {
          return (
            <LinkIconBox
              key={tool.link.id}
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
