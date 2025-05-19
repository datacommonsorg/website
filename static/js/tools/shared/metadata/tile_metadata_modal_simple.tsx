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
 * Displays a modal with links for each stat var to their page in Stat Var Explorer.
 * This is the original chart metadata modal, and is used as a fallback for when
 * only string sources are provided, but not facets.
 *
 * If facets are provided, TileMetadataModal is used.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement, useEffect, useMemo, useState } from "react";

import { Button } from "../../../components/elements/button/button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../../../components/elements/dialog/dialog";
import { ArrowForward } from "../../../components/elements/icons/arrow_forward";
import { intl } from "../../../i18n/i18n";
import { messages } from "../../../i18n/i18n_messages";
import { StatVarSpec } from "../../../shared/types";
import { getDataCommonsClient } from "../../../utils/data_commons_client";
import { apiRootToHostname } from "../../../utils/url_utils";

const SV_EXPLORER_REDIRECT_PREFIX = "/tools/statvar#sv=";

interface TileMetadataModalSimpleProps {
  statVarSpecs: StatVarSpec[];
  containerRef?: React.RefObject<HTMLElement>;
  apiRoot?: string;
}

// [dcid, name]
type DcidNameTuple = [string, string];

function MetadataRow(props: {
  dcid: string;
  name: string;
  apiRoot?: string;
}): ReactElement {
  return (
    <li>
      <ArrowForward />
      <a
        href={
          apiRootToHostname(props.apiRoot) +
          SV_EXPLORER_REDIRECT_PREFIX +
          props.dcid
        }
        target="_blank"
        rel="noreferrer"
      >
        {props.name}
      </a>
    </li>
  );
}

export function TileMetadataModalSimple(
  props: TileMetadataModalSimpleProps
): ReactElement {
  const theme = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statVarNames, setStatVarNames] = useState<DcidNameTuple[]>([]);
  const dataCommonsClient = getDataCommonsClient(props.apiRoot);

  const dcids = useMemo(() => {
    const dcidSet = new Set<string>();
    if (props.statVarSpecs) {
      for (const spec of props.statVarSpecs) {
        dcidSet.add(spec.statVar);
        if (spec.denom) {
          dcidSet.add(spec.denom);
        }
      }
    }
    return dcidSet;
  }, [props.statVarSpecs]);

  useEffect(() => {
    // Only fetch data once the modal is opened.
    if (!modalOpen) return;
    if (dcids.size == statVarNames.length) return;
    setLoading(true);
    (async (): Promise<void> => {
      const responseObj = await dataCommonsClient.getFirstNodeValues({
        dcids: [...dcids],
        prop: "name",
      });
      const responseList = new Array<DcidNameTuple>();
      for (const dcid in responseObj) {
        responseList.push([dcid, responseObj[dcid]]);
      }
      // Sort by name
      responseList.sort((a, b) => (a[1] > b[1] ? 1 : -1));
      setStatVarNames(responseList);
      setLoading(false);
    })();
  }, [props, modalOpen, dcids, statVarNames.length, dataCommonsClient]);

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
        open={modalOpen}
        containerRef={props.containerRef}
        onClose={(): void => setModalOpen(false)}
        maxWidth="md"
        className="metadata-modal"
        loading={loading}
      >
        <DialogTitle>{intl.formatMessage(messages.chooseVariable)}</DialogTitle>
        <DialogContent>
          <div
            css={css`
              width: 100%;
              display: flex;
              flex-direction: column;
              gap: ${theme.spacing.lg}px;
              && {
                h4 {
                  ${theme.typography.family.text}
                  ${theme.typography.text.md}
                font-weight: 900;
                  margin: 0;
                }
                p,
                li {
                  ${theme.typography.family.text}
                  ${theme.typography.text.md}
                  white-space: pre-wrap;
                  word-break: break-word;
                }
                a {
                  white-space: pre-wrap;
                  word-break: break-word;
                }
                ul {
                  margin: 0;
                  padding: 0;
                  display: block;
                  li {
                    display: flex;
                    margin: 0 0 ${theme.spacing.md}px 0;
                    padding: 0;
                    gap: ${theme.spacing.xs}px;
                    color: ${theme.colors.link.primary.base};
                    svg {
                      display: block;
                      margin-top: ${theme.spacing.xs}px;
                    }
                    a {
                      display: block;
                    }
                  }
                }
              }
            `}
          >
            <p>{intl.formatMessage(messages.selectVariable)}</p>
            <ul>
              {statVarNames.length
                ? statVarNames.map((dcidName, i) => (
                    <MetadataRow
                      dcid={dcidName[0]}
                      name={dcidName[1]}
                      apiRoot={props.apiRoot}
                      key={i}
                    />
                  ))
                : // Use DCID as display name as a fallback. Note, might not be displayed in order.
                  [...dcids].map((dcid, i) => (
                    <MetadataRow
                      dcid={dcid}
                      name={dcid}
                      apiRoot={props.apiRoot}
                      key={i}
                    />
                  ))}
            </ul>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
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
