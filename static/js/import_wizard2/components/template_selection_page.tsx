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
 * Page for selecting a template and uploading a file.
 */

import _ from "lodash";
import React, { useState } from "react";
import { Button, Card, CardBody, Label } from "reactstrap";

import { TEMPLATE_OPTIONS } from "../templates";

interface TemplateSelectionPageProps {
  onContinueClicked: () => void;
  selectedTemplate: string;
  onTemplateChanged: (templateId: string) => void;
  uploadedFile: File;
  onUploadedFileChanged: (uploadedFile: File) => void;
}

export function TemplateSelectionPage(
  props: TemplateSelectionPageProps
): JSX.Element {
  const sortedTemplateIds = Object.keys(TEMPLATE_OPTIONS).sort();
  const [openedInfo, setOpenedInfo] = useState(new Set());

  // Toggle open/close the info for given templateId
  function onInfoToggled(templateId: string): void {
    const newOpenedInfo = _.cloneDeep(openedInfo);
    if (newOpenedInfo.has(templateId)) {
      newOpenedInfo.delete(templateId);
    } else {
      newOpenedInfo.add(templateId);
    }
    setOpenedInfo(newOpenedInfo);
  }

  return (
    <>
      <h2>Select Template and Upload File</h2>
      <div>Please choose a template that best matches your data file</div>
      <div className="template-options-container">
        {sortedTemplateIds.map((templateId) => {
          return (
            <Card
              key={templateId}
              onClick={(): void => props.onTemplateChanged(templateId)}
              className={`template-option${
                templateId === props.selectedTemplate ? "-selected" : ""
              }`}
            >
              <div className="template-example-section">
                <div className="template-example-table">
                  {props.selectedTemplate === templateId && (
                    <span className={"material-icons selected-icon"}>
                      check_circle
                    </span>
                  )}
                  {TEMPLATE_OPTIONS[templateId].table}
                  <span
                    className={"material-icons-outlined info-button"}
                    onMouseEnter={(e): void => {
                      onInfoToggled(templateId);
                      e.stopPropagation();
                    }}
                    onMouseLeave={(e): void => {
                      onInfoToggled(templateId);
                      e.stopPropagation();
                    }}
                  >
                    info
                  </span>
                  <div className="template-example-explanation-container">
                    {openedInfo.has(templateId) && (
                      <div className="template-example-explanation">
                        {TEMPLATE_OPTIONS[templateId].explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <CardBody>
                <div className="template-option-title">
                  {TEMPLATE_OPTIONS[templateId].title}
                </div>
                <div className="template-option-subtitle">
                  {TEMPLATE_OPTIONS[templateId].subtitle}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
      <div className="file-upload-section">
        <Label for="file-upload-input" className="upload-file-button">
          Choose File
        </Label>
        <input
          id="file-upload-input"
          type="file"
          accept=".csv"
          onChange={(event): void => {
            const files = event.target.files;
            if (files.length < 1) {
              // TODO: handle malformed csv
              return;
            }
            props.onUploadedFileChanged(files[0]);
          }}
          style={{ display: "none" }}
        ></input>
        <span>
          {props.uploadedFile ? props.uploadedFile.name : "No file chosen"}
        </span>
      </div>
      {props.uploadedFile && (
        <Button
          onClick={(): void => props.onContinueClicked()}
          className="nav-btn"
        >
          Continue
        </Button>
      )}
    </>
  );
}
