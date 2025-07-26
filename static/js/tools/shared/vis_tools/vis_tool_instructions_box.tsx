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
/** @jsxImportSource @emotion/react */

/**
 * An instruction box for our map, scatter, and timeline tool to display
 * on their landing pages.
 */

import React from "react";

import { InfoBox } from "../../../components/content/info_box";
import { intl } from "../../../i18n/i18n";
import { toolMessages } from "../../../i18n/i18n_tool_messages";

interface VisToolInstructionsBoxProps {
  // Which tool the instructions are for
  toolType: "map" | "scatter" | "timeline";
}

/**
 * Helper function to determine which variation on the instructions for
 * inputting a place the box should show.
 * @param props props passed into VisToolInstructionsBox
 * @returns an i18n formatted string to display in the instructions
 */
function getPlaceInstructionToShow(props: VisToolInstructionsBoxProps): string {
  switch (props.toolType) {
    case "map": {
      return intl.formatMessage(toolMessages.infoBoxInstructionsPlacesMap);
    }
    case "scatter": {
      return intl.formatMessage(toolMessages.infoBoxInstructionsPlacesScatter);
    }
    default: {
      return intl.formatMessage(toolMessages.infoBoxInstructionsPlacesTimeline);
    }
  }
}

export function VisToolInstructionsBox(
  props: VisToolInstructionsBoxProps
): JSX.Element {
  return (
    <InfoBox
      heading={intl.formatMessage(toolMessages.infoBoxInstructionHeader)}
    >
      <ol>
        <li>{getPlaceInstructionToShow(props)}</li>
        <li>
          {props.toolType == "map" ? (
            <>
              <span className="d-none d-lg-inline">
                {intl.formatMessage(
                  toolMessages.infoBoxInstructionsVariableDesktop
                )}
              </span>
              <span className="d-inline d-lg-none">
                {intl.formatMessage(
                  toolMessages.infoBoxInstructionsVariableMobile
                )}
              </span>
            </>
          ) : (
            <>
              <span className="d-none d-lg-inline">
                {intl.formatMessage(
                  toolMessages.infoBoxInstructionsMultiVariableDesktop
                )}
              </span>
              <span className="d-inline d-lg-none">
                {intl.formatMessage(
                  toolMessages.infoBoxInstructionsMultiVariableMobile
                )}
              </span>
            </>
          )}
        </li>
      </ol>
    </InfoBox>
  );
}
