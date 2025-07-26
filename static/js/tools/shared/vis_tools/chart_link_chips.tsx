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
 * Wall of links to example charts for the visualization tools
 */

import React from "react";

import { LinkChips } from "../../../components/content/link_chips";
import { Link } from "../../../components/elements/link_chip";
import { intl } from "../../../i18n/i18n";
import { toolMessages } from "../../../i18n/i18n_tool_messages";
import { landingPageLinks } from "./landing_page_example_links";

interface ChartLinkChipsProps {
  toolType: "map" | "scatter" | "timeline";
}

/** Gets the set of link chips for the correct tool from the config */
function getLinkChips(props: ChartLinkChipsProps): Link[] {
  switch (props.toolType) {
    case "map": {
      return landingPageLinks.mapLinks;
    }
    case "scatter": {
      return landingPageLinks.scatterLinks;
    }
    default: {
      return landingPageLinks.timelineLinks;
    }
  }
}

export function ChartLinkChips(props: ChartLinkChipsProps): JSX.Element {
  return (
    <LinkChips
      variant="flat"
      header={intl.formatMessage(toolMessages.ExamplesHeader)}
      headerComponent="h4"
      section={`${props.toolType}_tool_example_charts`}
      linkChips={getLinkChips(props)}
      chipTextSize="sm"
    />
  );
}
