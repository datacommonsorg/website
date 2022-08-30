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

import React, { useState } from "react";
import { Button } from "reactstrap";

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

  return (
    <>
      <h2>Step 1: What format is the data in?</h2>
      <div>Please choose a template that best matches your data file</div>
      <div className="template-options-container">
        {sortedTemplateIds.map((templateId) => {
          return (
            <div
              key={templateId}
              onClick={() => setSelectedTemplate(templateId)}
              className={`template-option${
                templateId === selectedTemplate ? "-selected" : ""
              }`}
            >
              <div>{TEMPLATE_OPTIONS[templateId].description}</div>
              <div className="template-option-example-container">
                <span>e.g.,</span>
                <div className="template-option-example">
                  <div className="template-example-table">
                    {TEMPLATE_OPTIONS[templateId].table}
                  </div>
                  <div className="template-example-explanation">
                    {TEMPLATE_OPTIONS[templateId].explanation}
                  </div>
                </div>
              </div>
            </div>
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
