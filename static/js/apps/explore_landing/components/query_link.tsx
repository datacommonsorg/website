/**
 * Copyright 2024 Google LLC
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
 * Component for query links used by various components in the explore section.
 */

import React, { ReactElement } from "react";

import { CLIENT_TYPES } from "../../../constants/app/explore_constants";
import { Query } from "../../../shared/topic_config";

interface QueryLinkProps {
  query: Query;
  appName: string;
}

export function QueryLink(props: QueryLinkProps): ReactElement {
  const { query } = props;
  const cliParam = `client=${CLIENT_TYPES.LANDING}`;
  let url = `${window.location.origin}/${props.appName}#${cliParam}`;
  if (props.appName == "explore") {
    if (query.url) {
      url += `&${query.url}`;
    } else {
      url += `&oq=${encodeURIComponent(query.title)}`;
    }
  } else {
    // NL
    url += `&q=${encodeURIComponent(query.title)}&a=True`;
  }
  return (
    <a data-testid={`query-link-"${query.title}"`} href={url}>
      {query.title}
    </a>
  );
}
