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
import React, { useState } from "react";

import { CsvData } from "../types";
import { Info } from "./info";
import { MappingPage } from "./mapping_page";
import { TemplateSelectionPage } from "./template_selection_page";
import { UploadPage } from "./upload_page";

enum PageType {
  INFO,
  MAPPING,
  TEMPLATE,
  UPLOAD,
}
// The order in which the different pages should appear
const ORDERED_PAGES = [
  PageType.INFO,
  PageType.TEMPLATE,
  PageType.UPLOAD,
  PageType.MAPPING,
];

export function Page(): JSX.Element {
  const [currPage, setCurrPage] = useState(0);
  const [templateId, setTemplateId] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const currPageType = ORDERED_PAGES[currPage];

  return (
    <>
      {currPageType === PageType.INFO && (
        <Info onStartClicked={() => setCurrPage(currPage + 1)} />
      )}
      {currPageType === PageType.TEMPLATE && (
        <TemplateSelectionPage
          onContinueClicked={(templateId) => {
            setTemplateId(templateId);
            setCurrPage(currPage + 1);
          }}
          selectedTemplate={templateId}
        />
      )}
      {currPageType === PageType.UPLOAD && (
        <UploadPage
          onBackClicked={() => setCurrPage(currPage - 1)}
          onContinueClicked={(csvData: CsvData) => {
            setCsvData(csvData);
            setCurrPage(currPage + 1);
          }}
        />
      )}
      {currPageType === PageType.MAPPING && (
        <MappingPage
          csvData={csvData}
          selectedTemplate={templateId}
          onChangeFile={() => {
            const uploadPage = ORDERED_PAGES.findIndex(
              (pageType) => pageType === PageType.UPLOAD
            );
            setCurrPage(uploadPage);
          }}
          onChangeTemplate={() => {
            const templatePage = ORDERED_PAGES.findIndex(
              (pageType) => pageType === PageType.TEMPLATE
            );
            setCurrPage(templatePage);
          }}
        />
      )}
    </>
  );
}
