/**
 * Copyright 2025 Google LLC
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
<<<<<<<< HEAD:static/js/apps/custom_dc/one/homepage/main.ts
 * One.org: Entry point for the home page.
========
 * Component for wrapping a set of form components in a card
>>>>>>>> upstream/customdc_stable:static/js/tools/shared/place_selector/stat_var_hierarchy_toggle_button.tsx
 */

import React from "react";

import { Button } from "../../../components/elements/button/button";

<<<<<<<< HEAD:static/js/apps/custom_dc/one/homepage/main.ts
window.addEventListener("load", (): void => {
  const metadataContainer = document.getElementById("metadata-base");
  renderPage(metadataContainer);
});

function renderPage(metadataContainer: HTMLElement): void {
  const primarySiteWebRoot = metadataContainer.dataset.primarySiteWebRoot;

  ReactDOM.render(
    React.createElement(App, {
      primarySiteWebRoot,
    }),
    document.getElementById("app-container")
========
interface StatVarHierarchyToggleButtonProps {
  onClickCallback: () => void;
  text: string;
}

export function StatVarHierarchyToggleButton(
  props: StatVarHierarchyToggleButtonProps
): JSX.Element {
  return (
    <div className="d-inline d-lg-none">
      <Button variant="inverted" onClick={props.onClickCallback}>
        {props.text}
      </Button>
    </div>
>>>>>>>> upstream/customdc_stable:static/js/tools/shared/place_selector/stat_var_hierarchy_toggle_button.tsx
  );
}
