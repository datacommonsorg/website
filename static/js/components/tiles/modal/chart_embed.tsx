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

import React, { useRef } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

import { intl } from "../../../i18n/i18n";
import { randDomId } from "../../../shared/util";
import { CopyButton, IconButton } from "../../form_components/icon_buttons";

interface ChartEmbedPropsType {
  container?: HTMLElement;
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
  chartAttributes: Record<string, string[]>;
  // whether to show modal open or closed
  isOpen: boolean;
  // function to run when modal is toggled open or closed
  toggleCallback: () => void;
}

function getEmbedCode(
  chartType: string,
  chartAttributes: Record<string, string[]>
) {
  return `  <!-- Include this line at in the <head> tag of your webpage -->
  <script src="https://datacommons.org/datacommons.js"></script>

  <!-- Include these lines in the <body> of your webpage -->
  <datacommons-${chartType}>
  ${Object.entries(chartAttributes)
    .map(([key, values]) => {
      return `\t${key}="${values.join(" ")}"`;
    })
    .join("\n")}
  ></datacommons-${chartType}>`;
}

export function ChartEmbed(props: ChartEmbedPropsType): JSX.Element {
  // const [showModal, setShowModal] = useState(false);
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

  const embedCode = getEmbedCode(props.chartType, props.chartAttributes);

  if (!props.chartType || !props.chartAttributes) {
    return null;
  }

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
