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
 * Component for previewing the results of the mapping and downloading the
 * import package
 */
import JSZip from "jszip";
import React, { useEffect, useState } from "react";
import { Button } from "reactstrap";

import { ValueMap } from "../../import_wizard/types";
import { CsvData, Mapping } from "../types";
import {
  generateCsv,
  generateTranslationMetadataJson,
} from "../utils/file_generation";
import {
  generateRowObservations,
  observationToString,
} from "../utils/obs_generation";
import { generateTMCF } from "../utils/tmcf_generation";

interface MappingPreviewSectionProps {
  predictedMapping: Mapping;
  correctedMapping: Mapping;
  csvData: CsvData;
  shouldGenerateCsv: boolean;
  valueMap: ValueMap;
}

const MAX_ROW_SAMPLES = 3;

export function MappingPreviewSection(
  props: MappingPreviewSectionProps
): JSX.Element {
  const [isGeneratingFiles, setIsGeneratingFiles] = useState(false);
  const [sampleObs, setSampleObs] = useState(
    generateRowObservations(
      props.correctedMapping,
      props.csvData,
      props.valueMap
    )
  );
  const zipFolder = new JSZip().folder("importPackage");

  useEffect(() => {
    setSampleObs(
      generateRowObservations(
        props.correctedMapping,
        props.csvData,
        props.valueMap
      )
    );
  }, [props.correctedMapping, props.csvData, props.valueMap]);

  return (
    <>
      <div className="section-container">
        <div className="section-header">
          <h2>Example Observations</h2>
        </div>
        <div>
          {Array.from(sampleObs.keys()).map((row) => {
            const rowObs = sampleObs.get(row).slice(0, MAX_ROW_SAMPLES);
            return (
              <div key={`sample-obs-${row}`}>
                Row {row.toString()}
                <ul>
                  {rowObs.map((obs, idx) => {
                    const obsString = observationToString(obs);
                    return <li key={`row-${row}-obs-${idx}`}>{obsString}</li>;
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      <Button className="nav-btn" onClick={onDownloadClicked}>
        Download Package
      </Button>
      <div
        id="screen"
        style={{ display: isGeneratingFiles ? "block" : "none" }}
      >
        <div id="spinner"></div>
      </div>
    </>
  );

  function getCleanCsvPromise(): Promise<string> {
    if (props.shouldGenerateCsv) {
      return generateCsv(props.csvData, props.valueMap);
    } else {
      return Promise.resolve(null);
    }
  }

  function onDownloadClicked(): void {
    setIsGeneratingFiles(true);
    const files: Record<string, string | Blob> = {};
    const translationMetadataJson = generateTranslationMetadataJson(
      props.predictedMapping,
      props.correctedMapping
    );
    files["translationMetadata.json"] = new Blob([translationMetadataJson], {
      type: "text/json",
    });
    files["import.tmcf"] = generateTMCF(props.correctedMapping);
    getCleanCsvPromise()
      .then((csvString) => {
        if (props.shouldGenerateCsv) {
          files["cleanedData.csv"] = new Blob([csvString], {
            type: "text/csv;chartset=utf-8",
          });
        }
        Object.entries(files).forEach(([fileName, fileContent]) => {
          zipFolder.file(fileName, fileContent);
        });
        zipFolder.generateAsync({ type: "blob" }).then((content) => {
          const link = document.createElement("a");
          const url = window.URL.createObjectURL(content);
          link.setAttribute("href", url);
          link.setAttribute("download", "importPackage.zip");
          setIsGeneratingFiles(false);
          link.onclick = () => {
            setTimeout(() => window.URL.revokeObjectURL(url));
          };
          link.click();
          link.remove();
        });
      })
      .catch(() => {
        setIsGeneratingFiles(false);
        alert("Sorry, there was a problem generating the import package.");
      });
  }
}
