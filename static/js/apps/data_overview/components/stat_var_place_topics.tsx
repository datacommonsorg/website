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
 * Component for the stat var queries on country data pages.
 */

import { css } from "@emotion/react";
import React, { ReactElement } from "react";

import { LinkChips } from "../../../components/content/link_chips";
import { Link } from "../../../components/elements/link_chip";
import { Box } from "../../../components/elements/wrappers/box";
import { Query } from "../../../shared/topic_config";
import { Place } from "../place_data";

interface StatVarPlaceTopicsProps {
  //the display name of the place (e.g. Canada)
  place: Place;
  //the display name of the topic (e.g. Economics)
  topic: string;
  //the stat var queries that will be displayed as link chips in this component
  queries: Query[];
}

export function StatVarPlaceTopics({
  place,
  topic,
  queries,
}: StatVarPlaceTopicsProps): ReactElement {
  const statVarLinkChips: Link[] = queries.map((query) => ({
    id: query.url,
    title: query.title,
    url: query.url,
    variant: "flat",
  }));

  statVarLinkChips.push({
    id: "see-more-in-timelines",
    title: "See more in the timelines explorer",
    url: `/tools/visualization#visType%3Dtimeline%26place%3D${place.dcid}`,
    variant: "flat",
    colorVariant: "grey",
  });

  return (
    <Box>
      <LinkChips
        header={`${place.name} · ${topic}`}
        headerComponent="h4"
        section="statvar"
        containerSx={css`
          max-width: 100%;
        `}
        linkChips={statVarLinkChips}
      />
    </Box>
  );
}
