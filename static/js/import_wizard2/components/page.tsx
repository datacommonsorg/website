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

import React, { useEffect, useState } from "react";

import { TEMPLATE_OPTIONS, TEMPLATE_PREDICTION_VALIDATION } from "../templates";
import { Mapping } from "../types";
import { DownloadPage } from "./download_page";
import { Info } from "./info";
import { MappingPage } from "./mapping_page";
import { TemplateSelectionPage } from "./template_selection_page";
import { UploadPage } from "./upload_page";

enum PageType {
  INFO,
  MAPPING,
  TEMPLATE,
  UPLOAD,
  DOWNLOAD,
}
// The order in which the different pages should appear
const ORDERED_PAGES = [
  PageType.INFO,
  PageType.TEMPLATE,
  PageType.UPLOAD,
  PageType.MAPPING,
  PageType.DOWNLOAD,
];

export function Page(): JSX.Element {
  const [currPage, setCurrPage] = useState(0);
  const [templateId, setTemplateId] = useState(
    Object.keys(TEMPLATE_OPTIONS).sort()[0]
  );
  const [uploadedFile, setUploadedFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  // TODO: call detection API to get predicted mappings
  const [predictedMapping, setPredictedMapping] = useState<Mapping>(new Map());
  const [userMapping, setUserMapping] = useState<Mapping>(new Map());
  // TODO(chejennifer): Get the valueMap from MappingSectionComponent

  const currPageType = ORDERED_PAGES[currPage];

  useEffect(() => {
    if (!csvData || !templateId) {
      return;
    }
    // TODO: Use actual prediction from server-side detection API.
    const predictedMapping = new Map();
    setPredictedMapping(predictedMapping);
    const userMappingFn = TEMPLATE_PREDICTION_VALIDATION[templateId];
    setUserMapping(userMappingFn(predictedMapping));
  }, [csvData, templateId]);

  return (
    <>
      {currPageType === PageType.INFO && (
        <Info onStartClicked={(): void => setCurrPage(currPage + 1)} />
      )}
      {currPageType === PageType.TEMPLATE && (
        <TemplateSelectionPage
          onContinueClicked={(): void => {
            setCurrPage((prev) => prev + 1);
          }}
          selectedTemplate={templateId}
          onTemplateChanged={setTemplateId}
          uploadedFile={uploadedFile}
          onUploadedFileChanged={setUploadedFile}
        />
      )}
      {currPageType === PageType.UPLOAD && (
        <UploadPage
          uploadedFile={uploadedFile}
          csvData={csvData}
          onCsvDataUpdated={setCsvData}
          onBackClicked={(): void => setCurrPage((prev) => prev - 1)}
          onContinueClicked={(): void => setCurrPage((prev) => prev + 1)}
        />
      )}
      {currPageType === PageType.MAPPING && (
        <MappingPage
          userMapping={userMapping}
          onUserMappingUpdated={setUserMapping}
          csvData={csvData}
          selectedTemplate={templateId}
          onBackClicked={(): void => setCurrPage((prev) => prev - 1)}
          onContinueClicked={(): void => setCurrPage((prev) => prev + 1)}
        />
      )}
      {currPageType === PageType.DOWNLOAD && (
        <DownloadPage
          originalFile={uploadedFile}
          predictedMapping={predictedMapping}
          correctedMapping={userMapping}
          csvData={csvData}
          valueMap={{}} // TODO(chejennifer): Pass in the real ValueMap
          onBackClicked={(): void => setCurrPage((prev) => prev - 1)}
        />
      )}
    </>
  );
}
