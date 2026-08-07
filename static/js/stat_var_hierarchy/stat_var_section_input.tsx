/**
 * Copyright 2021 Google LLC
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
 * Component for rendering a stat var section input (checkbox or radio button)
 * in the stat var hierarchy.
 */

import * as d3 from "d3";
import _ from "lodash";
import React from "react";

import { ASYNC_ELEMENT_CLASS } from "../constants/css_constants";
import { Context, ContextType } from "../shared/context";
import { StatVarInfo, StatVarSummary } from "../shared/types";
import {
  hideTooltip,
  isRadioButtonType,
  showTooltip,
  SV_HIERARCHY_SECTION_ID,
} from "./util";

const TOOLTIP_TOP_OFFSET = 10;

interface StatVarSectionInputPropType {
  path: string[];
  statVar: StatVarInfo;
  selected: boolean;
  summary: StatVarSummary;
  // prefix of the display name that should be replaced with "…"
  prefixToReplace: string;
}

interface StatVarSectionInputStateType {
  checked: boolean;
}

export class StatVarSectionInput extends React.Component<
  StatVarSectionInputPropType,
  StatVarSectionInputStateType
> {
  context: ContextType;
  constructor(props: StatVarSectionInputPropType) {
    super(props);
    this.state = {
      checked: false,
    };
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  componentDidMount(): void {
    this.setState({
      checked: this.isChecked(),
    });
  }

  componentDidUpdate(prevProps: StatVarSectionInputPropType): void {
    if (this.props !== prevProps) {
      this.setState({
        checked: this.isChecked(),
      });
    }
  }

  private isChecked(): boolean {
    return this.props.statVar.id in this.context.svPath;
  }

  private handleInputChange(): void {
    this.context.togglePath(this.props.statVar.id, this.props.path);
    this.setState({
      checked: !this.state.checked,
    });
  }

  render(): JSX.Element {
    const inputType = isRadioButtonType(this.context.statVarHierarchyType)
      ? "radio"
      : "checkbox";
    const sectionId = this.props.statVar.id + this.props.path.join("-");
    let className = "node-title";
    if (!this.props.statVar.hasData) {
      className = "node-title node-no-data";
    } else if (this.props.selected) {
      className = "node-title highlighted-node-title";
    }
    let displayName = this.props.statVar.displayName || this.props.statVar.id;
    // Only replace prefix in display name if prefix is shorter than display
    // name.
    if (
      !_.isEmpty(this.props.prefixToReplace) &&
      this.props.prefixToReplace.length < displayName.length
    ) {
      displayName = "…" + displayName.slice(this.props.prefixToReplace.length);
    }
    return (
      <form className={className}>
        <input
          id={sectionId}
          name="stat-var-hierarchy"
          type={inputType}
          checked={this.state.checked}
          onChange={this.handleInputChange}
          disabled={!this.props.statVar.hasData}
        />
        <label
          className={
            this.state.checked
              ? `selected-node-title ${ASYNC_ELEMENT_CLASS}`
              : ""
          }
          htmlFor={sectionId}
          onMouseMove={this.mouseMoveAction(this.props.statVar.hasData)}
          onMouseOut={(): void => hideTooltip()}
        >
          {displayName}
        </label>
      </form>
    );
  }

  /**
   * Returns the html content for the tooltip. The content can be an empty
   * string.
   */
  private getTooltipHtml(hasData: boolean): string {
    let html = `<b>${
      this.props.statVar.displayName || this.props.statVar.id
    }</b></br><span>dcid: ${this.props.statVar.id}</span></br>`;
    html += hasData
      ? ""
      : "This statistical variable has no data for any of the chosen places.";
    return html;
  }

  private mouseMoveAction =
    (hasData: boolean) =>
    (e): void => {
      const html = this.getTooltipHtml(hasData);
      if (_.isEmpty(html)) {
        return;
      }
      const containerClientRect = (
        d3.select(`#${SV_HIERARCHY_SECTION_ID}`).node() as HTMLElement
      ).getBoundingClientRect();
      const top = e.pageY - containerClientRect.y + TOOLTIP_TOP_OFFSET;
      const left = e.pageX - containerClientRect.x;
      showTooltip(html, { left, top });
    };
}

StatVarSectionInput.contextType = Context;
