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
 * Displays a list of sources (derived from the facets prop if available
 * or from the source set if not available) and a link to open a modal
 * dialog to display metadata. This link will open a more complete
 * metadata modal if the facets are available, or as a fall-back will
 * open the older simpler metadata modal that displays stat var links.
 */

import React, { ReactElement } from "react";

import { NL_SOURCE_REPLACEMENTS } from "../../../constants/app/explore_constants";
import { intl } from "../../../i18n/i18n";
import { messages } from "../../../i18n/i18n_messages";
import {
  GA_EVENT_TILE_EXPLORE_MORE,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../../shared/ga_events";
import { StatMetadata } from "../../../shared/stat_types";
import { StatVarSpec } from "../../../shared/types";
import { urlToDisplayText } from "../../../shared/util";
import { isNlInterface } from "../../../utils/explore_utils";
import { TileMetadataModal } from "./tile_metadata_modal";
import { TileMetadataModalSimple } from "./tile_metadata_modal_simple";

export function TileSources(props: {
  // the facets that make up the sources of the charts
  // if given, these will be used to supply the source list, and to populate
  // the detailed metadata modal. If not supplied, we fall back to a simple
  // modal display using the sources.
  facets?: Record<string, StatMetadata>;
  // A mapping of which stat var used which facet
  statVarToFacet?: Record<string, string>;
  // If available, the stat vars to link to.
  statVarSpecs?: StatVarSpec[];
  // The original string sources (urls) - now optional
  // If given and the facets and mappings are not given, we
  // fall back to the old sources.
  sources?: Set<string> | string[];
  containerRef?: React.RefObject<HTMLElement>;
  apiRoot?: string;
}): ReactElement {
  const { facets, statVarToFacet, statVarSpecs, sources } = props;
  if (!facets && !sources) {
    return null;
  }

  const sourceList: string[] = facets
    ? Object.values(facets).map((facet) => facet.provenanceUrl)
    : Array.from(sources);
  //const seenSourceText = new Set();
  const sourcesJsx = sourceList.map((source, index) => {
    // HACK for updating source for NL interface
    let sourceUrl = source;
    if (isNlInterface()) {
      sourceUrl = NL_SOURCE_REPLACEMENTS[source] || source;
    }
    const sourceText = urlToDisplayText(sourceUrl);
    return (
      <span key={sourceUrl}>
        {index > 0 ? ", " : ""}
        <a
          href={sourceUrl}
          rel="noreferrer"
          target="_blank"
          title={sourceUrl}
          onClick={(): boolean => {
            triggerGAEvent(GA_EVENT_TILE_EXPLORE_MORE, {
              [GA_PARAM_URL]: sourceUrl,
            });
            return true;
          }}
        >
          {sourceText}
        </a>
        {globalThis.viaGoogle
          ? " " + intl.formatMessage(messages.viaGoogle)
          : ""}
      </span>
    );
  });
  return (
    <>
      {sourcesJsx.length > 0 && (
        <div className="sources" {...{ part: "source" }}>
          {sourcesJsx.length > 1
            ? intl.formatMessage(messages.sources)
            : intl.formatMessage(messages.source)}
          : <span {...{ part: "source-links" }}>{sourcesJsx}</span>
          {statVarSpecs && statVarSpecs.length > 0 && (
            <>
              <span {...{ part: "source-separator" }}> • </span>
              <span {...{ part: "source-show-metadata-link" }}>
                {facets && statVarToFacet ? (
                  <TileMetadataModal
                    apiRoot={props.apiRoot}
                    containerRef={props.containerRef}
                    statVarSpecs={statVarSpecs}
                    facets={facets}
                    statVarToFacet={statVarToFacet}
                  ></TileMetadataModal>
                ) : (
                  <TileMetadataModalSimple
                    apiRoot={props.apiRoot}
                    containerRef={props.containerRef}
                    statVarSpecs={statVarSpecs}
                  ></TileMetadataModalSimple>
                )}
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}
