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
 * Page for selecting a template
 */

import _ from "lodash";
import React, { useState } from "react";
import { Button, Card, CardBody } from "reactstrap";

import { TEMPLATE_OPTIONS } from "../templates";

interface TemplateSelectionPageProps {
  onContinueClicked: (templateId: string) => void;
  selectedTemplate: string;
}

export function TemplateSelectionPage(
  props: TemplateSelectionPageProps
): JSX.Element {
  const sortedTemplateIds = Object.keys(TEMPLATE_OPTIONS).sort();
  const [selectedTemplate, setSelectedTemplate] = useState(
    props.selectedTemplate || sortedTemplateIds[0]
  );
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
      <h2>Select Template</h2>
      <div>Please choose a template that best matches your data file</div>
      <div className="template-options-container">
        {sortedTemplateIds.map((templateId) => {
          return (
            <Card
              key={templateId}
              onClick={() => setSelectedTemplate(templateId)}
              className={`template-option${
                templateId === selectedTemplate ? "-selected" : ""
              }`}
            >
              <div className="template-example-section">
                <div className="template-example-table">
                  {selectedTemplate === templateId && (
                    <span className={"material-icons selected-icon"}>
                      check_circle
                    </span>
                  )}
                  {TEMPLATE_OPTIONS[templateId].table}
                  <span
                    className={"material-icons-outlined info-button"}
                    onClick={(e) => {
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
      <Button
        onClick={() => props.onContinueClicked(selectedTemplate)}
        className="nav-btn"
      >
        Continue
      </Button>
    </>
  );
}
