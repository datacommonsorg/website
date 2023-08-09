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
 * Wrapper for selectors used in the selector pane.
 */

import _ from "lodash";
import React from "react";

interface SelectorWrapperPropType {
  headerTitle: string;
  selectedValues: string[];
  disabled: boolean;
  children: React.ReactNode;
}

export function SelectorWrapper(props: SelectorWrapperPropType): JSX.Element {
  const divClasses = [
    "selector-container",
    props.disabled ? "disabled" : "enabled",
  ];
  return (
    <div className={divClasses.join(" ")}>
      <div className="selector-header">
        <div className="header-title">
          <span>{props.headerTitle}</span>
        </div>
      </div>
      {!props.disabled && <>{props.children}</>}
    </div>
  );
}
