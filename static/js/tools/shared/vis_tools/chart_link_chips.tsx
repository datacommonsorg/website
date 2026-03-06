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
import {
  toolMessages,
  VisToolExampleChartMessages,
} from "../../../i18n/i18n_tool_messages";

declare global {
  interface Window {
    visToolExamples?: VisToolExample[];
  }
}

export interface VisToolExample {
  id?: string;
  title?: string;
  titleMessageId?: string;
  url: string;
}

interface ChartLinkChipsProps {
  toolType: "map" | "scatter" | "timeline";
  visToolExamples: VisToolExample[];
}

function getLinkChips(config: VisToolExample[]): Link[] {
  if (!config || !Array.isArray(config)) {
    return [];
  }

  const links: Link[] = [];
  let generatedId = 0;

  for (const item of config) {
    let finalTitle = item.title;

    const messageKey =
      item.titleMessageId as keyof typeof VisToolExampleChartMessages;
    if (!finalTitle && messageKey && VisToolExampleChartMessages[messageKey]) {
      finalTitle = intl.formatMessage(VisToolExampleChartMessages[messageKey]);
    }

    if (!finalTitle) {
      continue;
    }

    links.push({
      id: item.id || `example-link-${generatedId++}`,
      title: finalTitle,
      url: item.url,
    });
  }

  return links;
}

export function ChartLinkChips(props: ChartLinkChipsProps): JSX.Element {
  return (
    <LinkChips
      variant="flat"
      header={intl.formatMessage(toolMessages.ExamplesHeader)}
      headerComponent="h4"
      section={`${props.toolType}_tool_example_charts`}
      linkChips={getLinkChips(props.visToolExamples)}
      chipTextSize="sm"
    />
  );
}
