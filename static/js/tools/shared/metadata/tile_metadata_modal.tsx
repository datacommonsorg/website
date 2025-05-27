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
 * Displays a modal with comprehensive metadata for a particular chart.
 *
 * The modal displays each stat var used in the chart, and for each
 * stat var, relevant information about the provenance/source used by
 * that stat var.
 *
 * At the bottom of the modal, we display a combined citation section.
 */

import React, { ReactElement, useEffect, useMemo, useState } from "react";

import { Button } from "../../../components/elements/button/button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../../../components/elements/dialog/dialog";
import { intl } from "../../../i18n/i18n";
import { messages } from "../../../i18n/i18n_messages";
import { metadataComponentMessages } from "../../../i18n/i18n_metadata_messages";
import { StatMetadata } from "../../../shared/stat_types";
import { NamedNode, StatVarFacetMap, StatVarSpec } from "../../../shared/types";
import { getDataCommonsClient } from "../../../utils/data_commons_client";
import { buildCitationParts, citationToPlainText } from "./citations";
import { CopyCitationButton } from "./copy_citation_button";
import { StatVarMetadata } from "./metadata";
import { fetchMetadata } from "./metadata_fetcher";
import { TileMetadataModalContent } from "./tile_metadata_modal_content";

interface TileMetadataModalPropType {
  // A full set of the facets used within the chart
  facets: Record<string, StatMetadata>;
  // A mapping of which stat var used which facets
  statVarToFacets?: StatVarFacetMap;
  // the stat vars used in the chart
  statVarSpecs: StatVarSpec[];
  containerRef?: React.RefObject<HTMLElement>;
  // root URL used to generate stat var explorer and license links
  apiRoot?: string;
}

export function TileMetadataModal(
  props: TileMetadataModalPropType
): ReactElement {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statVars, setStatVars] = useState<NamedNode[]>([]);
  const [metadataMap, setMetadataMap] = useState<
    Record<string, StatVarMetadata[]>
  >({});
  const dataCommonsClient = getDataCommonsClient(props.apiRoot);

  const statVarSet = useMemo(() => {
    const result = new Set<string>();
    if (props.statVarSpecs) {
      for (const spec of props.statVarSpecs) {
        result.add(spec.statVar);
        if (spec.denom) {
          result.add(spec.denom);
        }
      }
    }
    return result;
  }, [props.statVarSpecs]);

  useEffect(() => {
    if (!modalOpen) return;
    if (statVarSet.size === statVars.length) return;

    setLoading(true);
    fetchMetadata(
      statVarSet,
      props.facets,
      dataCommonsClient,
      props.statVarToFacets,
      props.apiRoot
    )
      .then((resp) => {
        setMetadataMap(resp.metadata);
        setStatVars(resp.statVarList);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    modalOpen,
    statVarSet,
    statVars.length,
    dataCommonsClient,
    props.apiRoot,
    props.statVarToFacets,
    props.facets,
  ]);

  useEffect(() => {
    setStatVars([]);
  }, [props.facets, props.statVarToFacets]);

  const citationParts = useMemo(
    () => buildCitationParts(statVars, metadataMap),
    [statVars, metadataMap]
  );
  const citationText = useMemo(
    () => citationToPlainText(citationParts),
    [citationParts]
  );

  return (
    <>
      <a
        href="#"
        onClick={(e): void => {
          e.preventDefault();
          setModalOpen(true);
        }}
      >
        {intl.formatMessage(messages.showMetadata)}
      </a>
      <Dialog
        containerRef={props.containerRef}
        open={modalOpen}
        onClose={(): void => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        loading={loading}
      >
        <DialogTitle>{intl.formatMessage(messages.metadata)}</DialogTitle>
        <DialogContent>
          {!loading && (
            <TileMetadataModalContent
              statVars={statVars}
              metadataMap={metadataMap}
              apiRoot={props.apiRoot}
            />
          )}
        </DialogContent>
        <DialogActions>
          <CopyCitationButton citationToCopy={citationText}>
            {intl.formatMessage(metadataComponentMessages.CopyCitation)}
          </CopyCitationButton>
          <Button
            variant="text"
            onClick={(): void => {
              setModalOpen(false);
            }}
          >
            {intl.formatMessage(messages.close)}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
