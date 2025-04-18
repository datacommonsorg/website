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
 * A component that demos the dialog.
 */

// TODO (nick-next): Remove this file before PR is merged into master.

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import React, { ReactElement, useState } from "react";

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../../../components/elements/dialog/Dialog";

const StyledDialog = styled(Dialog)`
  background: hotpink;

  & .dialog-title {
    color: blue;
  }

  & .dialog-content {
    line-height: 1.5;
  }

  & .dialog-actions button {
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
  }
`;

export const DemoDialog = (): ReactElement => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        css={css`
          margin-bottom: ${theme.spacing.lg}px;
          padding: 8px 16px;
          font-size: 1rem;
          cursor: pointer;
        `}
        onClick={(): void => setOpen(true)}
      >
        Click
      </button>
      <StyledDialog open={open} onClose={(): void => setOpen(false)}>
        <DialogTitle className="custom-title">Sample Dialog</DialogTitle>
        <DialogContent>This is a sample dialog content.</DialogContent>
        <DialogActions>
          <button onClick={(): void => setOpen(false)}>Close</button>
        </DialogActions>
      </StyledDialog>
    </div>
  );
};
