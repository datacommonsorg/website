/**
 * Copyright 2022 Google LLC
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
 * Component to select a source and dataset.
 */

import React from "react";
import { Card, Container, CustomInput } from "reactstrap";

import { NamedNode } from "../../shared/types";
import { updateHash } from "../../utils/url_utils";
import { SV_URL_PARAMS } from "./stat_var_constants";

const CSS_PREFIX = "dataset-selector";

interface DatasetSelectorProps {
  // DCID of currently selected dataset.
  dataset: string;
  // DCID and name of current datasets.
  datasets: NamedNode[];
  // DCID of currently selected source.
  source: string;
  // DCID and name of sources.
  sources: NamedNode[];
}

export function DatasetSelector(props: DatasetSelectorProps): JSX.Element {
  return (
    <>
      <Card className={`${CSS_PREFIX}-card`}>
        <Container fluid={true} className={`${CSS_PREFIX}-container`}>
          <div className={`${CSS_PREFIX}-label`}>Filter variables by</div>
          <CustomInput
            id={`${CSS_PREFIX}-source-custom-input`}
            className={`${CSS_PREFIX}-custom-input`}
            type="select"
            value={props.source}
            onChange={(e) => {
              const dcid = e.currentTarget.value ? e.currentTarget.value : "";
              updateHash({
                [SV_URL_PARAMS.SOURCE]: dcid,
                [SV_URL_PARAMS.DATASET]: "",
              });
            }}
          >
            <option value="">Data source</option>
            {props.sources.map((s) => {
              return (
                <option
                  value={s.dcid}
                  key={s.dcid}
                  id={`${CSS_PREFIX}-${s.dcid}`}
                >
                  {s.name}
                </option>
              );
            })}
          </CustomInput>
          <CustomInput
            id={`${CSS_PREFIX}-dataset-custom-input`}
            className={`${CSS_PREFIX}-custom-input`}
            type="select"
            value={props.dataset}
            onChange={(e) => {
              const dcid = e.currentTarget.value ? e.currentTarget.value : "";
              updateHash({ [SV_URL_PARAMS.DATASET]: dcid });
            }}
          >
            <option value="">Dataset</option>
            {props.datasets.map((d) => {
              return (
                <option
                  value={d.dcid}
                  key={d.dcid}
                  id={`${CSS_PREFIX}-${d.dcid}`}
                >
                  {d.name}
                </option>
              );
            })}
          </CustomInput>
        </Container>
      </Card>
    </>
  );
}
