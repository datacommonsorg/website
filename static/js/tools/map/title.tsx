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
 * Title component before a chart is shown.
 */

import React, { useContext } from "react";

import { intl, LocalizedLink } from "../../i18n/i18n";
import { Context } from "./context";
import { ifShowChart } from "./util";

export function Title(): JSX.Element {
  const { statVar, placeInfo } = useContext(Context);
  return (
    <>
      {!ifShowChart(statVar.value, placeInfo.value) && (
        <>
          <div className="app-header">
            <h1 className="mb-4">Map Explorer</h1>
            <a href="/tools/visualization#visType%3Dmap">
              Go back to the new Data Commons
            </a>
          </div>
        </>
      )}
    </>
  );
}

/**
 * Title component with updated text and styling to improve UX
 *
 * TODO(juliawu): Once migration to old tools is complete, replace the Title
 *                component with this one.
 */
export function StandardizedTitle(): JSX.Element {
  return (
    <div className="standardized-vis-tool-wrapper">
      <div className="standardized-vis-tool-header">
        <h1>
          {intl.formatMessage({
            id: "map_visualization_tool_name",
            defaultMessage: "Map Explorer",
            description: "name of the tool that plots maps",
          })}
        </h1>
        <LocalizedLink
          href="/tools/visualization#visType%3Dmap"
          text={intl.formatMessage({
            id: "switch_tool_version",
            defaultMessage: "Switch tool version",
            description:
              "label on button allowing users to switch to an earlier version of our tools",
          })}
        ></LocalizedLink>
      </div>
      <div className="standardized-vis-tool-subheader">
        {intl.formatMessage({
          id: "map_visualization_tool_description",
          defaultMessage:
            "The map explorer helps you visualize how a statistical variable can vary across geographic regions.",
          description:
            "a description of what our map explorer tool is used for",
        })}
      </div>
    </div>
  );
}
