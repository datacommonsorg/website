/**
 * Copyright 2024 Google LLC
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

import _ from "lodash";
import React, { useRef } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

import { intl } from "../../../i18n/i18n";
import { randDomId } from "../../../shared/util";
import { CopyButton, IconButton } from "../../form_components/icon_buttons";

/**
 * Modal with code user can use to embed chart on their own website
 * as a web component
 * */

export interface ChartEmbedSpec {
  // Allowed chart types for <datacommons-{chart type}> web components
  chartType:
    | "bar"
    | "gauge"
    | "highlight"
    | "line"
    | "map"
    | "pie"
    | "ranking"
    | "scatter";
  // web-component field -> values for the chart
  chartAttributes: Record<string, string | string[] | number | boolean>;
}

interface ChartEmbedPropsType {
  // properties of the chart being embedded, used to generate embed code
  chartEmbedSpec?: ChartEmbedSpec;
  // containing element to attach modal to
  container?: HTMLElement;
  // whether to show modal open or closed
  isOpen: boolean;
  // function to run when modal is toggled open or closed
  toggleCallback: () => void;
}

export function ChartEmbed(props: ChartEmbedPropsType): JSX.Element {
  const textareaElementRef = useRef<HTMLTextAreaElement>(null);
  const modalId = randDomId();

  /**
   * On click handler on the text area.
   * - If the user clicks on the text area and doesn't drag the mouse,
   *   select all of the text (to help them copy and paste)
   * - If the user clicks and drags, don't select all of the text and allow them
   *   to make their selection
   */
  function onClickTextarea(): void {
    const selection = window.getSelection().toString();
    // User is trying to select specific text.
    if (selection) {
      return;
    }
    // User single-clicked without dragging. Select the entire CSV text
    textareaElementRef.current.focus();
    textareaElementRef.current.setSelectionRange(
      0,
      textareaElementRef.current.value.length
    );
  }

  if (
    !props.chartEmbedSpec.chartType ||
    !props.chartEmbedSpec.chartAttributes
  ) {
    return null;
  }

  const embedCode = getEmbedCode(props.chartEmbedSpec);

  return (
    <Modal
      isOpen={props.isOpen}
      toggle={props.toggleCallback}
      className="modal-dialog-centered modal-lg chart-embed-modal"
      container={props.container}
      id={modalId}
    >
      <ModalHeader toggle={props.toggleCallback}>
        {intl.formatMessage({
          id: "embed_export_chart_link",
          defaultMessage: "Embed this chart",
          description:
            "Text for the hyperlink text that will let users embed the chart in their website.",
        })}
      </ModalHeader>
      <ModalBody>
        <textarea
          className="modal-textarea"
          value={embedCode}
          readOnly
          ref={textareaElementRef}
          onClick={onClickTextarea}
          rows={10}
        ></textarea>
      </ModalBody>
      <ModalFooter>
        <CopyButton textToCopy={embedCode} />
        <IconButton label="Close" onClick={props.toggleCallback} primary />
      </ModalFooter>
    </Modal>
  );
}

/**
 * Generate the HTML code a user could copy and paste into their
 * webpage to render a chart as a web component
 * @param chartEmbedSpec chartType and fields to include in web component
 * @returns web component syntax to display in the modal
 */
function getEmbedCode(chartEmbedSpec: ChartEmbedSpec) {
  return `  <!-- Include this line at in the <head> tag of your webpage -->
  <script src="https://datacommons.org/datacommons.js"></script>

  <!-- Include these lines in the <body> of your webpage -->
  <datacommons-${chartEmbedSpec.chartType}
  ${Object.entries(chartEmbedSpec.chartAttributes)
    .map(([key, value]) => {
      if (!_.isEmpty(value)) {
        if (typeof value == "boolean") {
          return `${key}`;
        }
        const values = Array.isArray(value) ? value : [value.toString()];
        return `\t${key}="${values.join(" ")}"`;
      }
    })
    .filter((str) => !!str)
    .join("\n")}
  ></datacommons-${chartEmbedSpec.chartType}>`;
}
