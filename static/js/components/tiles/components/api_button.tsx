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
 * A button that will appear in a chart tile footer that, when
 * clicked, will open a dialog that displays API endpoint information
 * about that chart to the user.
 */

import React, { ReactElement, RefObject, useState } from "react";

import { intl } from "../../../i18n/i18n";
import { chartComponentMessages } from "../../../i18n/i18n_chart_messages";
import { ObservationSpec } from "../../../shared/observation_specs";
import { fetchStatVarNames } from "../../../tools/shared/metadata/metadata_fetcher";
import { getDataCommonsClient } from "../../../utils/data_commons_client";
import { ApiDialog } from "./api_dialog";

interface ApiButtonProps {
  // API root for data fetch; this will be used to create the
  // API endpoint call with the correct API root.
  // If not provided, it will be "https://api.datacommons.org"
  apiRoot?: string;
  // A callback function passed through from the chart that will collate
  // a set of observation specs relevant to the chart. These
  // specs can be hydrated into API calls.
  getObservationSpecs?: () => ObservationSpec[];
  // A ref to the chart container element.
  containerRef?: RefObject<HTMLElement>;
}

export function ApiButton({
  apiRoot,
  getObservationSpecs,
  containerRef,
}: ApiButtonProps): ReactElement {
  const [apiOpen, setApiOpen] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiSpecs, setApiSpecs] = useState<ObservationSpec[]>([]);
  const [statVarNameMap, setStatVarNameMap] = useState<Record<string, string>>(
    {}
  );

  const onClickApi = async (): Promise<void> => {
    if (!getObservationSpecs) return;
    setApiOpen(true);
    setApiLoading(true);
    try {
      const specs = getObservationSpecs();
      setApiSpecs(specs);

      const allSvDcids = new Set<string>();
      for (const s of specs) {
        for (const v of s.statVarDcids) allSvDcids.add(v);
      }

      if (allSvDcids.size > 0) {
        const dataCommonsClient = getDataCommonsClient(apiRoot);
        const namedNodes = await fetchStatVarNames(
          Array.from(allSvDcids),
          dataCommonsClient
        );

        const nameMap: Record<string, string> = {};
        for (const n of namedNodes) nameMap[n.dcid] = n.name || n.dcid;
        setStatVarNameMap(nameMap);
      } else {
        setStatVarNameMap({});
      }
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <>
      <span className="material-icons-outlined">code</span>
      <a
        href="#"
        onClick={(e): void => {
          e.preventDefault();
          void onClickApi();
        }}
      >
        {intl.formatMessage(chartComponentMessages.ApiDialogButtonText)}
      </a>
      <ApiDialog
        open={apiOpen}
        loading={apiLoading}
        apiRoot={apiRoot}
        specs={apiSpecs}
        statVarNameMap={statVarNameMap}
        onClose={(): void => setApiOpen(false)}
        containerRef={containerRef}
      />
    </>
  );
}
