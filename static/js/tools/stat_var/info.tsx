/**
 * Copyright 2021 Google LLC
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
 * Default content for Stat Var Explorer when no stat var is selected.
 */

import React, { Component } from "react";

import { InfoBox } from "../../components/content/info_box";
import { intl } from "../../i18n/i18n";
import { toolMessages } from "../../i18n/i18n_tool_messages";

class Info extends Component {
  render(): JSX.Element {
    return (
      <InfoBox>
        <span className="d-none d-lg-inline">
          {intl.formatMessage(toolMessages.statVarExplorerInstructionsDesktop)}
        </span>
        <span className="d-inline d-lg-none">
          {intl.formatMessage(toolMessages.statVarExplorerInstructionsMobile)}
        </span>{" "}
        {intl.formatMessage(toolMessages.statVarExplorerInstructionsDataSource)}
      </InfoBox>
    );
  }
}

export { Info };
