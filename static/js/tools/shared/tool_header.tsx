/**
 * Copyright 2022 Google LLC
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
 * Title component for the tools
 */

import React from "react";

import { intl, LocalizedLink } from "../../i18n/i18n";

interface ToolHeaderProps {
  title: string; // Name of the tool to use as a title
  subtitle?: string; // Text to show below the title
  switchToolsUrl?: string; // URL of an alternate version of the tool
}

export function ToolHeader(props: ToolHeaderProps): JSX.Element {
  return (
    <div className="standardized-tool-header-wrapper">
      <div className="standardized-tool-header">
        <h1>{props.title}</h1>
        {props.switchToolsUrl && (
          <LocalizedLink
            href={props.switchToolsUrl}
            text={intl.formatMessage({
              id: "switch_tool_version",
              defaultMessage: "Switch tool version",
              description:
                "label on button allowing users to switch to an earlier version of our tools",
            })}
          ></LocalizedLink>
        )}
      </div>
      {props.subtitle && (
        <div className="standardized-tool-subheader">{props.subtitle}</div>
      )}
    </div>
  );
}
