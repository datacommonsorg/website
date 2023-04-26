/**
 * Copyright 2023 Google LLC
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
 * Component for the page where user can download their files
 */

import JSZip from "jszip";
import _ from "lodash";
import React, { useState } from "react";
import { Button } from "reactstrap";

import { ValueMap } from "../../import_wizard/types";
import { downloadFile } from "../../shared/util";
import { CsvData, Mapping } from "../types";
import {
  generateCsv,
  generateTranslationMetadataJson,
  shouldGenerateCsv,
} from "../utils/file_generation";
import { generateTMCF } from "../utils/tmcf_generation";

interface DownloadPagePropType {
  originalFile: File;
  predictedMapping: Mapping;
  correctedMapping: Mapping;
  csvData: CsvData;
  valueMap: ValueMap;
  onBackClicked: () => void;
}

// Keys to use for the possible file types users can download.
const FILE_KEYS = {
  TMCF: "tmcfFile",
  METADATA: "translationMetadata",
  CLEANED_CSV: "cleanedCsv",
  USER_CSV: "userCsv",
  ALL: "allFiles",
};

// Map of file type key to the label to use to describe the file.
const FILE_TYPE_LABEL = {
  [FILE_KEYS.TMCF]: "Generated TMCF file",
  [FILE_KEYS.METADATA]: "Mapping metadata file",
  [FILE_KEYS.CLEANED_CSV]: "Cleaned CSV file",
  [FILE_KEYS.USER_CSV]: "Your file",
};

// Gets a map of file type key to the file name to use for that file.
function getFileTypeNames(originalFileName: string): Record<string, string> {
  const baseFileName = originalFileName.substring(
    0,
    originalFileName.lastIndexOf(".")
  );
  return {
    [FILE_KEYS.TMCF]: `${baseFileName}.tmcf`,
    [FILE_KEYS.METADATA]: "translationMetadata.json",
    [FILE_KEYS.CLEANED_CSV]: `${baseFileName}_cleaned.csv`,
    [FILE_KEYS.USER_CSV]: originalFileName,
    [FILE_KEYS.ALL]: `${baseFileName}.zip`,
  };
}

export function DownloadPage(props: DownloadPagePropType): JSX.Element {
  // Set of files that are being generated and downloaded
  const [filesDownloading, setFilesDownloading] = useState(new Set([]));

  const fileTypeNames = getFileTypeNames(
    props.originalFile ? props.originalFile.name : ""
  );
  // Map of file type key to a promise that returns the file of that type.
  const fileContentPromise = {
    [FILE_KEYS.TMCF]: getTmcfBlob,
    [FILE_KEYS.METADATA]: getMetadataBlob,
    [FILE_KEYS.CLEANED_CSV]: getCleanedCsvBlob,
    [FILE_KEYS.USER_CSV]: () => Promise.resolve(props.originalFile),
    [FILE_KEYS.ALL]: getAllFilesBlob,
  };
  // List of file type keys that are available for download.
  const availableFiles = [
    FILE_KEYS.TMCF,
    FILE_KEYS.METADATA,
    FILE_KEYS.USER_CSV,
    FILE_KEYS.ALL,
  ];
  // Only allow downloading of the cleaned csv if it needs to be generated.
  if (shouldGenerateCsv(props.csvData, props.csvData, props.valueMap)) {
    availableFiles.unshift(FILE_KEYS.CLEANED_CSV);
  }

  const zipFolder = new JSZip().folder(fileTypeNames[FILE_KEYS.ALL]);

  return (
    <>
      <h2>Download Files</h2>
      <div className="download-page-content">
        <div>
          You are finished! Download the following files to use for your import.
        </div>
        {availableFiles.map((fileKey) => {
          const fileName = fileTypeNames[fileKey];
          const isfileGenerating = filesDownloading.has(fileKey);
          return (
            <div className="file-download-section" key={fileKey}>
              {fileKey in FILE_TYPE_LABEL && (
                <span>
                  <b>{FILE_TYPE_LABEL[fileKey]}</b>: {fileName}
                </span>
              )}
              <div
                onClick={() => onDownload(fileKey, fileContentPromise[fileKey])}
                className="file-download-button"
              >
                <span
                  style={{
                    visibility: isfileGenerating ? "hidden" : "visible",
                  }}
                >
                  {fileKey === FILE_KEYS.ALL ? "Download All" : "Download"}
                </span>
                <div style={{ display: isfileGenerating ? "block" : "none" }}>
                  <div id="spinner"></div>
                </div>
              </div>
            </div>
          );
        })}
        <div className="navigation-section">
          <Button className="nav-btn" onClick={props.onBackClicked}>
            Back
          </Button>
        </div>
      </div>
    </>
  );

  // Function to download a file given a file type key and a promise that
  // returns the file to download.
  function onDownload(
    fileKey: string,
    getFile: () => Promise<File | Blob>
  ): void {
    setFilesDownloading((prev) => {
      const updatedSet = _.cloneDeep(prev);
      updatedSet.add(fileKey);
      return updatedSet;
    });
    getFile()
      .then((file) => {
        const fileName = fileTypeNames[fileKey] || fileKey;
        downloadFile(fileName, file);
        setFilesDownloading((prev) => {
          const updatedSet = _.cloneDeep(prev);
          updatedSet.delete(fileKey);
          return updatedSet;
        });
      })
      .catch(() => {
        setFilesDownloading((prev) => {
          const updatedSet = _.cloneDeep(prev);
          updatedSet.delete(fileKey);
          return updatedSet;
        });
      });
  }

  // Gets a promise that returns the translation metadata json as a blob.
  function getMetadataBlob(): Promise<Blob> {
    const translationMetadata = generateTranslationMetadataJson(
      props.predictedMapping,
      props.correctedMapping
    );
    const file = new Blob([translationMetadata], {
      type: "text/json",
    });
    return Promise.resolve(file);
  }

  // Gets a promise that returns the tmcf as a blob.
  function getTmcfBlob(): Promise<Blob> {
    const tmcf = generateTMCF(props.correctedMapping);
    const file = new Blob([tmcf], {
      type: "text/plain",
    });
    return Promise.resolve(file);
  }

  // Gets a promise that returns the cleaned csv as a blob.
  function getCleanedCsvBlob(): Promise<Blob> {
    return generateCsv(props.csvData, props.valueMap)
      .then((csvString) => {
        return new Blob([csvString], {
          type: "text/csv;charset=utf-8",
        });
      })
      .catch(() => {
        return null;
      });
  }

  // Gets a promise that returns all the available files in a zipped folder
  // as a blob.
  function getAllFilesBlob(): Promise<Blob> {
    // Filter out the file type key for all files because that's what we're
    // generating here so we don't want to include it in the folder.
    const packageFileTypes = availableFiles.filter(
      (fileKey) => fileKey !== FILE_KEYS.ALL
    );
    // Get the list of promises for generating each type of file.
    const filePromises = packageFileTypes.map((fileKey) => {
      if (!(fileKey in fileContentPromise)) {
        return Promise.resolve(null);
      }
      return fileContentPromise[fileKey]();
    });
    // Wait for all the files to finish generating.
    return Promise.all(filePromises).then((files) => {
      packageFileTypes.forEach((fileKey, idx) => {
        if (!files[idx]) {
          return;
        }
        // Add all non null files to the zipped folder.
        const fileName = fileTypeNames[fileKey];
        zipFolder.file(fileName, files[idx]);
      });
      // Generate the zipped folder and return it as a blob.
      return zipFolder
        .generateAsync({ type: "blob" })
        .then((content) => {
          return content;
        })
        .catch(() => {
          return null;
        });
    });
  }
}
