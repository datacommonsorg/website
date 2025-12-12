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

const toolInstructions = {
  map: {
    variable: {
      desktop: intl.formatMessage(
        toolMessages.infoBoxInstructionsVariableDesktopMap
      ),
      mobile: intl.formatMessage(
        toolMessages.infoBoxInstructionsVariableMobileMap
      ),
    },
  },
  scatter: {
    variable: {
      desktop: intl.formatMessage(
        toolMessages.infoBoxInstructionsVariableDesktopScatter
      ),
      mobile: intl.formatMessage(
        toolMessages.infoBoxInstructionsVariableMobileScatter
      ),
    },
  },
  timeline: {
    variable: {
      desktop: intl.formatMessage(
        toolMessages.infoBoxInstructionsVariableDesktopTimeline
      ),
      mobile: intl.formatMessage(
        toolMessages.infoBoxInstructionsVariableMobileTimeline
      ),
    },
  },
};

interface VisToolInstructionsBoxProps {
  // Which tool the instructions are for
  toolType: VisType;
}

export function VisToolInstructionsBox(
  props: VisToolInstructionsBoxProps
): JSX.Element {
  const instructions = toolInstructions[props.toolType];
  const desktopText = instructions.variable.desktop;
  const mobileText = instructions.variable.mobile;

  // Instructions shown are responsive to desktop vs mobile screensizes
  // Uses bootstrap classes to match the implementation of the stat var
  // selection sidebar and "show variables" button.
  // TODO (juliawu): Switch all of these classes over to emotion styling.
  return (
    <InfoBox>
      <span className="d-none d-lg-inline">{desktopText}</span>
      <span className="d-inline d-lg-none">{mobileText}</span>
    </InfoBox>
  );
}
