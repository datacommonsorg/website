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
  multiPlace?: boolean;
  multiVariable?: boolean;
}

export function VisToolInstructionsBox(
  props: VisToolInstructionsBoxProps
): JSX.Element {
  return (
    <InfoBox
      heading={intl.formatMessage(
        toolMessages.infoBoxInstructionHeader
      )}
    >
      <ol>
        <li>
          {props.multiPlace
            ? intl.formatMessage(
                toolMessages.infoBoxInstructionsPlaces
              )
            : intl.formatMessage(
                toolMessages.infoBoxInstructionsPlacesIn
              )}
        </li>
        <li>
          {props.multiVariable ? (
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
          ) : (
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
          )}
        </li>
      </ol>
    </InfoBox>
  );
}
