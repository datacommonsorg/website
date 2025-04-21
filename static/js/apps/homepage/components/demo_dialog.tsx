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
 * A component that demos different dialog variants.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import React, { ReactElement, useRef, useState } from "react";

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../../../components/elements/dialog/dialog";
import theme from "../../../theme/theme";

const StyledButton = styled.button`
  border: 0;
  ${theme.box.primary}
  ${theme.elevation.primary}
  ${theme.typography.family.text};
  ${theme.typography.text.md};
  ${theme.radius.primary};
  ${theme.colors.link.primary.base}
  line-height: 1rem;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.sm}px;
  padding: 10px ${theme.spacing.lg}px 10px ${theme.spacing.md}px;
`;

const StyledDialog = styled(Dialog)`
  background: hotpink;

  & .dialog-title {
    color: blue;
  }

  & .dialog-actions button {
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
  }
`;

const ContainerWithDialogStyles = styled.div`
  padding: ${(props): number => props.theme.spacing.sm}px;
  background-color: hsl(218, 57.1%, 62.5%);
  color: white;

  & .dialog {
    max-width: 300px;
    background-color: #0b0c10;
  }

  & .dialog-title {
    background-color: #1f2833;
    color: white;
  }

  & .dialog-content {
    color: #c5c6c7;
  }

  & .dialog-actions button {
    background-color: #45a29e;
    color: #ffffff;
    border: none;
    border-radius: 20px;
  }
`;

export const DemoDialog = (): ReactElement => {
  const theme = useTheme();

  const [isSimpleDialogOpen, setIsSimpleDialogOpen] = useState(false);
  const [isCustomStyledDialogOpen, setIsCustomStyledDialogOpen] =
    useState(false);
  const [isContainerStyledDialogOpen, setIsContainerStyledDialogOpen] =
    useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        justify-content: flex-start;
        gap: 10px;
        @media (max-width: ${theme.breakpoints.md}px) {
          grid-template-columns: 1fr;
        }
        .box {
          ${theme.radius.tertiary};
          background: ${theme.colors.background.secondary.light};
          padding: ${theme.spacing.lg}px;
        }
      `}
    >
      <div className="box">
        <StyledButton onClick={(): void => setIsSimpleDialogOpen(true)}>
          Simple Dialog
        </StyledButton>

        <Dialog
          open={isSimpleDialogOpen}
          onClose={(): void => setIsSimpleDialogOpen(false)}
        >
          <DialogTitle>Simple Dialog</DialogTitle>
          <DialogContent>
            <p>This is a minimal dialog with default styling.</p>
          </DialogContent>
          <DialogActions>
            <StyledButton onClick={(): void => setIsSimpleDialogOpen(false)}>
              Close
            </StyledButton>
          </DialogActions>
        </Dialog>
      </div>

      <div className="box">
        <StyledButton onClick={(): void => setIsCustomStyledDialogOpen(true)}>
          Open Custom Styled Dialog
        </StyledButton>

        <StyledDialog
          open={isCustomStyledDialogOpen}
          onClose={(): void => setIsCustomStyledDialogOpen(false)}
          showCloseButton
        >
          <DialogTitle>Custom Styled Dialog</DialogTitle>
          <DialogContent>
            <p>
              This is the custom styled dialog that renders to document.body.
            </p>
            <p>
              It uses the hotpink background and blue title defined in
              StyledDialog.
            </p>
          </DialogContent>
          <DialogActions>
            <StyledButton
              onClick={(): void => setIsCustomStyledDialogOpen(false)}
            >
              Close
            </StyledButton>
          </DialogActions>
        </StyledDialog>
      </div>

      <div
        className="box"
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${theme.spacing.sm}px;
        `}
      >
        <div>
          <StyledButton
            onClick={(): void => setIsContainerStyledDialogOpen(true)}
          >
            Open Container-Styled Dialog
          </StyledButton>
        </div>

        <ContainerWithDialogStyles ref={containerRef}>
          <p>
            The dialog will be inserted into the DOM of container. This
            container will style the dialog. Note the dialog will still be a
            modal and will not visually appear inside this container.
          </p>
        </ContainerWithDialogStyles>

        <Dialog
          open={isContainerStyledDialogOpen}
          onClose={(): void => setIsContainerStyledDialogOpen(false)}
          containerRef={containerRef}
          fadeOutDuration={150}
          disableEscapeToClose
          disableOutsideClickToClose
        >
          <DialogTitle>Container-Styled Dialog</DialogTitle>
          <DialogContent>
            <p>
              This dialog inherits styles from the container we mounted it in.
            </p>
            <p>Notice the black and blue coloring of this dialog.</p>
            <p>
              These styles come from the ContainerWithDialogStyles component.
            </p>
          </DialogContent>
          <DialogActions>
            <StyledButton
              onClick={(): void => setIsContainerStyledDialogOpen(false)}
            >
              Close
            </StyledButton>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};
