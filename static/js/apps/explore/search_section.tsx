/**
 * Copyright 2023 Google LLC
 *
 * Licensed under he Apache License, Version 2.0 (the "License");
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
 * Component for the search section
 */

import React from "react";

import { NlSearchBar } from "../../components/nl_search_bar";
import { URL_HASH_PARAMS } from "../../constants/app/explore_constants";
import { getFeedbackLink } from "../../utils/nl_interface_utils";
import { updateHash } from "../../utils/url_utils";

// TODO (juliawu): Extract this out to a global flag we can set to remove
//                 all feedback items for external launch.
// Flag to determine whether or not to show link to feedback form
const DEVELOPER_MODE = true;
const FEEDBACK_LINK =
  "https://docs.google.com/forms/d/14oXA39Il7f20Rvtqkx_KZNn2NXTi7D_ag_hiX8oH2vc/viewform?usp=pp_url";

export function SearchSection(props: {
  query: string;
  debugData: any;
  exploreContext: any;
}): JSX.Element {
  const feedbackLink = getFeedbackLink(
    FEEDBACK_LINK,
    props.query || "",
    props.debugData,
    props.exploreContext
  );

  return (
    <NlSearchBar
      inputId="query-search-input"
      onSearch={(q) => {
        updateHash({
          [URL_HASH_PARAMS.QUERY]: q,
          [URL_HASH_PARAMS.PLACE]: "",
          [URL_HASH_PARAMS.TOPIC]: "",
        });
      }}
      placeholder={props.query}
      initialValue={props.query}
      shouldAutoFocus={false}
      feedbackLink={DEVELOPER_MODE ? feedbackLink : undefined}
    />
  );
}
