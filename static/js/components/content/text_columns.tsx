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

/**
 * A component to display textual content in two columns
 */

import React, { ReactElement } from "react";

interface TextColumnsProps {
  //an optional header for the column section
  header?: string;
  //the content of the two columns, given as slot props:
  //<TextColumns.Left>...</TextColumns.Left><TextColumns.Right>...</TextColumns.Right>
  children: ReactElement | ReactElement[];
}

interface TextColumnsSlotProps {
  //the content that populates either of the two columns
  children: ReactElement | ReactElement[] | string;
}

const TextColumnsLeft = ({ children }: TextColumnsSlotProps): ReactElement => {
  return <div className="col_left">{children}</div>;
};

const TextColumnsRight = ({ children }: TextColumnsSlotProps): ReactElement => {
  return <div className="col_right">{children}</div>;
};

export const TextColumns = ({
  header,
  children,
}: TextColumnsProps): ReactElement => {
  return (
    <>
      {header && (
        <header className="header">
          <h3>{header}</h3>
        </header>
      )}
      <div className="text_columns">{children}</div>
    </>
  );
};

TextColumns.Left = TextColumnsLeft;
TextColumns.Right = TextColumnsRight;
