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

import { VisType } from "../../../apps/visualization/redirect_constants";
import { InfoBox } from "../../../components/content/info_box";
import { intl } from "../../../i18n/i18n";
import { toolMessages } from "../../../i18n/i18n_tool_messages";

interface VisToolInstructionsBoxProps {
  // Which tool the instructions are for
  toolType: VisType;
  // Whether to only show instructions for selecting stat vars
  showStatVarInstructionsOnly?: boolean;
}

/**
 * Helper function to determine which variation on the instructions for
 * inputting a place the box should show.
 * @param props props passed into VisToolInstructionsBox
 * @returns an i18n formatted string to display in the instructions
 */
function getPlaceInstructionToShow(visType: VisType): string {
  switch (visType) {
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

/**
 * Helper function to determine which variation on the instructions for
 * selecting statistical variables the box should show.
 *
 * Returns both desktop and mobile versions of the message in the format
 *    [ desktop, mobile ]
 *
 * @param props props passed into VisToolInstructionsBox
 * @returns i18n formatted strings to display in the instructions
 */
function getVariableInstructionToShow(visType: VisType): [string, string] {
  switch (visType) {
    case "map": {
      return [
        intl.formatMessage(toolMessages.infoBoxInstructionsVariableDesktopMap),
        intl.formatMessage(toolMessages.infoBoxInstructionsVariableMobileMap),
      ];
    }
    case "scatter": {
      return [
        intl.formatMessage(
          toolMessages.infoBoxInstructionsVariableDesktopScatter
        ),
        intl.formatMessage(
          toolMessages.infoBoxInstructionsVariableMobileScatter
        ),
      ];
    }
    default: {
      return [
        intl.formatMessage(
          toolMessages.infoBoxInstructionsVariableDesktopTimeline
        ),
        intl.formatMessage(
          toolMessages.infoBoxInstructionsVariableMobileTimeline
        ),
      ];
    }
  }
}

export function VisToolInstructionsBox(
  props: VisToolInstructionsBoxProps
): JSX.Element {
  const [desktopText, mobileText] = getVariableInstructionToShow(
    props.toolType
  );
  // Instructions shown are responsive to desktop vs mobile screensizes
  // Uses bootstrap classes to match the implementation of the stat var
  // selection sidebar and "show variables" button.
  // TODO (juliawu): Switch all of these classes over to emotion styling.
  const StatVarInstructions = (
    <>
      <span className="d-none d-lg-inline">{desktopText}</span>
      <span className="d-inline d-lg-none">{mobileText}</span>
    </>
  );
  if (props.showStatVarInstructionsOnly) {
    return <InfoBox>{StatVarInstructions}</InfoBox>;
  } else {
    return (
      <InfoBox
        heading={intl.formatMessage(toolMessages.infoBoxInstructionHeader)}
      >
        <ol>
          <li>{getPlaceInstructionToShow(props.toolType)}</li>
          <li>{StatVarInstructions}</li>
        </ol>
      </InfoBox>
    );
  }
}
