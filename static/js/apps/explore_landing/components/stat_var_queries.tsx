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
 * Component for the stat var queries on the explore landing pages.
 */

import React, { ReactElement } from "react";

import { LinkChips } from "../../../components/content/link_chips";
import { Link } from "../../../components/elements/link_chip";
import { Query } from "../../../shared/topic_config";

interface StatVarQueriesProps {
  //the stat var queries that will be displayed as link chips in this component
  queries: Query[];
}

export function StatVarQueries({ queries }: StatVarQueriesProps): ReactElement {
  const statVarLinkChips: Link[] = queries.map((query) => ({
    id: query.url,
    title: query.title,
    url: query.url,
    variant: "flat",
  }));

  if (queries.length === 0) {
    return null;
  }
  return (
    <LinkChips
      header={
        "Explore statistical variables around the world in the Timeline explorer tool"
      }
      headerComponent="h3"
      section="statvar"
      linkChips={statVarLinkChips}
    />
  );
}
