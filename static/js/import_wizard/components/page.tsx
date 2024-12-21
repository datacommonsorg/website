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
 * Main component for the import wizard.
 */

import _ from "lodash";
import React, { useRef, useState } from "react";

import { CsvData, Mapping, ValueMap } from "../types";
import { PlaceDetector } from "../utils/detect_place";
import { shouldGenerateCsv } from "../utils/file_generation";
import { MappingSection } from "./mapping_section";
import { PreviewSection } from "./preview_section";
import { UploadSection } from "./upload_section";
import { ValueMapSection } from "./value_map_section";

export function Page(): JSX.Element {
  const [csv, setCsv] = useState<CsvData>(null);
  const [predictedMapping, setPredictedMapping] = useState<Mapping>(null);
  const [corrections, setCorrections] = useState<{
    mapping: Mapping;
    csv: CsvData;
  }>(null);
  const [valueMap, setValueMap] = useState<ValueMap>({});
  const [showValueMap, setShowValueMap] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const showMapping = !_.isEmpty(csv);
  const placeDetector = useRef(new PlaceDetector());

  return (
    <>
      <UploadSection
        onCsvProcessed={(csv): void => setCsv(csv)}
        onPredictionRetrieved={(prediction): void =>
          setPredictedMapping(prediction)
        }
        placeDetector={placeDetector.current}
      />
      {showMapping && (
        <MappingSection
          csvData={csv}
          predictedMapping={predictedMapping}
          onCorrectedMappingUpdated={(): void => {
            setShowPreview(false);
            setShowValueMap(false);
          }}
          onCorrectionsSubmitted={(mapping, csv): void => {
            setShowValueMap(true);
            setCorrections({ mapping, csv });
          }}
          placeDetector={placeDetector.current}
        />
      )}
      {showValueMap && (
        <ValueMapSection
          onValueMapSubmitted={(valueMap): void => {
            setShowPreview(true);
            setValueMap(valueMap);
          }}
          onValueMapUpdated={(): void => {
            setShowPreview(false);
          }}
          valueMap={valueMap}
        />
      )}
      {showPreview && (
        <div className="card-section">
          <PreviewSection
            predictedMapping={predictedMapping}
            correctedMapping={corrections.mapping}
            csvData={corrections.csv}
            shouldGenerateCsv={shouldGenerateCsv(
              csv,
              corrections.csv,
              valueMap
            )}
            valueMap={valueMap}
          />
        </div>
      )}
    </>
  );
}
