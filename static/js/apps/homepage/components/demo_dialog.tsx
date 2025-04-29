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

import { Button } from "../../../components/elements/button/button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../../../components/elements/dialog/dialog";
import { Download } from "../../../components/elements/icons/download";
import { IntegrationInstructions } from "../../../components/elements/icons/integration_instructions";

const StyledDialog = styled(Dialog)`
  background: hotpink;

  & .dialog-title {
    color: blue;
  }

  & .dialog-actions button {
    color: white;
    background-color: hotpink;
    border: 1px solid white;
    &:hover:not(:disabled):not([aria-disabled]) {
      background-color: white;
      border: 1px solid hotpink;
      color: hotpink;
    }
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
    color: white;
    background-color: #45a29e;
    border: 1px solid #0b0c10;
    &:hover:not(:disabled):not([aria-disabled]) {
      background-color: white;
      border: 1px solid #45a29e;
      color: #45a29e;
    }
  }
`;

export const DemoDialog = (): ReactElement => {
  const theme = useTheme();

  const [isSimpleDialogOpen, setIsSimpleDialogOpen] = useState(false);
  const [isDisabledCloseDialogOpen, setIsDisabledCloseDialogOpen] =
    useState(false);
  const [isMultipleActionsDialogOpen, setIsMultipleActionsDialogOpen] =
    useState(false);
  const [isContentDenseDialogOpen, setIsContentDenseDialogOpen] =
    useState(false);
  const [isFocusTrappingDialogOpen, setIsFocusTrappingDialogOpen] =
    useState(false);
  const [isKeepMountedDialogOpen, setIsKeepMountedDialogOpen] = useState(false);
  const [isCustomStyledDialogOpen, setIsCustomStyledDialogOpen] =
    useState(false);
  const [isContainerStyledDialogOpen, setIsContainerStyledDialogOpen] =
    useState(false);
  const [isPropStyleDialogOpen, setIsPropStyledDialogOpen] = useState(false);
  const [isLoadingDialogOpen, setIsLoadingDialogOpen] = useState(false);
  const [isDialogLoading, setIsDialogLoading] = useState(false);

  const openLoadingDialog = (): void => {
    setIsLoadingDialogOpen(true);
    setIsDialogLoading(true);
    setTimeout(() => {
      setIsDialogLoading(false);
    }, 1000);
  };

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
        <Button onClick={(): void => setIsSimpleDialogOpen(true)}>
          Simple Dialog
        </Button>

        <Dialog
          open={isSimpleDialogOpen}
          onClose={(): void => setIsSimpleDialogOpen(false)}
        >
          <DialogTitle>Simple Dialog</DialogTitle>
          <DialogContent>
            <p>This is a minimal dialog with default styling.</p>
          </DialogContent>
          <DialogActions>
            <Button onClick={(): void => setIsSimpleDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>

      <div className="box">
        <Button onClick={(): void => setIsDisabledCloseDialogOpen(true)}>
          Disabled Closing
        </Button>

        <Dialog
          open={isDisabledCloseDialogOpen}
          onClose={(): void => setIsDisabledCloseDialogOpen(false)}
          disableEscapeToClose
          disableOutsideClickToClose
        >
          <DialogTitle>Disabled Esc/Overlay Close Dialog</DialogTitle>
          <DialogContent>
            <p>
              The only way you can close this is by clicking close below.
              &quot;Escape to Close&quot; and &quot;Outside Click to Close&quot;
              have been disabled.
            </p>
            <p>
              These might be disabled if you have a complex form that inside the
              dialog that takes time and attention to fill, and where you do not
              want the user to be able to accidentally close it too easily.
            </p>
            <p>
              This can also be used if you want to force the user to close it
              using one of the button options (for example, if the user must
              agree to something).
            </p>
          </DialogContent>
          <DialogActions>
            <Button onClick={(): void => setIsDisabledCloseDialogOpen(false)}>
              I agree to the terms
            </Button>
          </DialogActions>
        </Dialog>
      </div>

      <div className="box">
        <Button onClick={(): void => setIsMultipleActionsDialogOpen(true)}>
          Simple Dialog Multiple Actions
        </Button>

        <Dialog
          open={isMultipleActionsDialogOpen}
          onClose={(): void => setIsMultipleActionsDialogOpen(false)}
        >
          <DialogTitle>Dialog with multiple actions</DialogTitle>
          <DialogContent>
            <p>
              Vivamus eget ex in diam ornare tincidunt quis et eros. Nullam
              ultrices tincidunt porttitor. Suspendisse eget efficitur ante.
              Nulla sollicitudin mauris id imperdiet egestas. Pellentesque quis
              justo arcu. Sed neque lacus, venenatis ut sagittis accumsan,
              ultrices ac turpis. Donec et hendrerit felis.
            </p>
            <p>
              Vivamus eget ex in diam ornare tincidunt quis et eros. Nullam
              ultrices tincidunt porttitor. Suspendisse eget efficitur ante.
              Nulla sollicitudin mauris id imperdiet egestas. Pellentesque quis
              justo arcu. Sed neque lacus, venenatis ut sagittis accumsan,
              ultrices ac turpis. Donec et hendrerit felis.
            </p>
          </DialogContent>
          <DialogActions>
            <Button startIcon={<Download />}>Download</Button>
            <Button startIcon={<IntegrationInstructions />}>
              Instructions
            </Button>
            <Button onClick={(): void => setIsMultipleActionsDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>

      <div className="box">
        <Button onClick={(): void => setIsContentDenseDialogOpen(true)}>
          Simple Dialog with Long Content
        </Button>

        <Dialog
          open={isContentDenseDialogOpen}
          onClose={(): void => setIsContentDenseDialogOpen(false)}
        >
          <DialogTitle>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. In eu purus
            sapien.
          </DialogTitle>
          <DialogContent>
            <p>
              Mauris lacinia tristique mauris, in hendrerit odio eleifend sit
              amet. In sapien nunc, mattis sed scelerisque nec, ornare a urna.
              In sollicitudin vulputate erat sed fermentum. Fusce mauris massa,
              cursus non viverra eu, sodales eu ipsum. Mauris tempor hendrerit
              iaculis. Nullam ullamcorper consectetur elit quis ullamcorper.
              Pellentesque feugiat nulla ut urna ornare, eget commodo metus
              dignissim. In eu metus lobortis, feugiat augue a, auctor tortor.
              Etiam condimentum diam non blandit vulputate. Suspendisse ut lacus
              dui. Maecenas maximus, magna a pellentesque blandit, justo ipsum
              imperdiet risus, quis cursus arcu nisi id magna. Phasellus quam
              dui, consectetur et purus eu, fringilla consectetur massa. Duis
              tellus quam, suscipit consequat diam eu, posuere consectetur
              magna.
            </p>
            <p>
              Aliquam blandit pellentesque enim, eu consequat ante facilisis
              eget. Proin nec sem dui. Nunc faucibus suscipit ligula at ornare.
              Aenean id tortor justo. Vestibulum molestie elit vel porta
              faucibus. Nulla facilisi. Donec quis dictum lectus. Ut elementum
              urna a porttitor consequat. Sed ante erat, vulputate vel diam
              vitae, fermentum vestibulum velit. Sed imperdiet aliquam lorem,
              sagittis sodales tortor placerat vel. Nam ornare lorem eget nunc
              ullamcorper, at mattis erat tincidunt. Duis dolor sem, molestie
              eleifend neque eget, convallis ullamcorper velit. Donec egestas,
              ante feugiat sollicitudin tempor, turpis ex elementum libero, quis
              luctus enim nisl a dui. Sed ut nibh ex. Nulla eget odio tortor.
              Donec bibendum imperdiet sem eget viverra.
            </p>
            <p>
              Donec ac ante blandit, hendrerit ex nec, feugiat nunc. Suspendisse
              laoreet mauris neque, ut posuere mi cursus non. Mauris ac nulla
              diam. Nunc id suscipit arcu. Suspendisse et nibh sed nunc iaculis
              pellentesque et quis turpis. Cras pretium finibus mi, tempus
              tristique dolor iaculis et. Vivamus egestas, enim sed laoreet
              hendrerit, sem eros faucibus ante, ac tincidunt sapien nibh non
              sapien. Donec molestie varius facilisis. Donec ut orci sit amet
              elit lobortis lacinia. In in ornare mi, tempor hendrerit augue. In
              libero nisl, suscipit at lacus et, varius suscipit nulla. Maecenas
              faucibus, velit auctor auctor aliquam, sem neque ultricies purus,
              a maximus lacus magna in quam. In semper ligula ut pellentesque
              imperdiet. Etiam eu nibh euismod, lobortis arcu eu, sollicitudin
              urna.
            </p>
            <p>
              Suspendisse potenti. Mauris eros sem, elementum ac bibendum vitae,
              aliquam nec nisi. Cras sit amet eros nunc. Praesent venenatis
              turpis nulla, ut pellentesque arcu pretium a. Aenean ornare tellus
              nibh, tincidunt pharetra leo lacinia quis. Morbi et congue ex.
              Curabitur lobortis volutpat augue, faucibus sagittis dui
              scelerisque eget.
            </p>
            <p>
              Donec faucibus aliquam ligula vel semper. Duis a rhoncus justo.
              Sed a aliquet purus, dignissim congue est. Nam non justo
              consequat, dapibus lorem ac, blandit sapien. Curabitur sed risus
              ut quam elementum luctus. Suspendisse euismod eros in nunc
              sollicitudin, id porta metus cursus. Pellentesque eget tellus
              ullamcorper, elementum nulla sit amet, tempus tellus. In tristique
              lectus et nisl gravida, vitae tristique purus venenatis. Quisque
              quis imperdiet orci, eu pretium lorem. Pellentesque sodales semper
              est non sodales. Phasellus libero velit, efficitur maximus rutrum
              et, luctus vitae magna. Praesent maximus pellentesque metus, non
              aliquet eros molestie non. Mauris mollis ante in nunc tempor, vel
              placerat odio aliquet.
            </p>
            <p>
              Vivamus nec neque tellus. Nullam a dolor tincidunt, dictum elit
              id, sagittis tellus. Aliquam pretium elit id magna egestas, et
              vehicula lectus ornare. Nulla vestibulum turpis et rutrum
              imperdiet. Praesent rhoncus ligula vitae tempor tristique. Sed ac
              hendrerit arcu. Integer dapibus velit sit amet odio dignissim
              sodales. Maecenas a velit nec elit semper malesuada. Sed egestas a
              arcu ut tempor. Pellentesque porta dolor non posuere interdum. Sed
              vitae velit et nisl luctus vulputate.
            </p>
            <p>
              Suspendisse suscipit mi nunc. Morbi turpis metus, suscipit in
              efficitur sit amet, accumsan vitae sapien. Quisque sed vehicula
              magna, vel placerat urna. Fusce convallis, urna et mollis
              tincidunt, quam magna fringilla tortor, sagittis dapibus ante
              ipsum ut risus. Aenean sed nisi nec quam finibus fermentum in non
              turpis. Vivamus cursus, metus vitae aliquam eleifend, sem mi
              suscipit lectus, ac egestas metus ligula in ligula. Aenean dictum
              placerat est.
            </p>
            <p>
              Proin a lobortis ligula, et scelerisque odio. Donec imperdiet est
              eget arcu ultrices, in dictum sapien ultricies. Morbi fermentum ut
              diam ut fringilla. Suspendisse venenatis lobortis felis vel
              lacinia. Vivamus non venenatis lacus. Quisque fringilla dui sed
              feugiat luctus. Pellentesque bibendum posuere urna eget
              ullamcorper. Aenean tincidunt dictum tincidunt. Vestibulum ipsum
              mauris, rutrum efficitur hendrerit eget, fringilla at nibh.
              Maecenas rhoncus euismod libero, sed cursus ex cursus id. Nulla
              gravida magna non leo placerat feugiat. Ut at accumsan metus
            </p>
            <p>
              Cras varius dolor nec sem commodo dignissim. Morbi hendrerit
              rutrum enim. Nulla non arcu id ipsum dignissim convallis in vitae
              felis. Integer vitae tempus lorem, quis rhoncus metus. Sed quis
              ipsum congue, sollicitudin felis ac, dignissim magna. Cras a
              rhoncus eros. Sed quis justo turpis. Duis rutrum neque ac odio
              sollicitudin elementum.
            </p>
          </DialogContent>
          <DialogActions>
            <Button startIcon={<Download />}>Download</Button>
            <Button startIcon={<IntegrationInstructions />}>
              Instructions
            </Button>
            <Button startIcon={<Download />}>Download</Button>
            <Button startIcon={<IntegrationInstructions />}>
              Instructions
            </Button>
            <Button startIcon={<Download />}>Download</Button>
            <Button startIcon={<IntegrationInstructions />}>
              Instructions
            </Button>
            <Button startIcon={<Download />}>Download</Button>
            <Button startIcon={<IntegrationInstructions />}>
              Instructions
            </Button>
            <Button onClick={(): void => setIsContentDenseDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>

      <div className="box">
        <Button onClick={(): void => setIsFocusTrappingDialogOpen(true)}>
          Focus Trapping
        </Button>

        <Dialog
          open={isFocusTrappingDialogOpen}
          onClose={(): void => setIsFocusTrappingDialogOpen(false)}
        >
          <DialogTitle>Form Dialog</DialogTitle>
          <DialogContent>
            <p>
              This is a dialog with multiple focusable items. Use the tab button
              to demonstrate focus handling.
            </p>
            <div
              css={css`
                display: flex;
                flex-direction: column;
                gap: ${theme.spacing.sm}px;
              `}
            >
              <button>An inert button</button>
              <input defaultValue="An input" />
              <select>
                <option>One</option>
                <option>Two</option>
                <option>Three</option>
              </select>
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={(): void => setIsFocusTrappingDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>

      <div className="box">
        <Button onClick={(): void => setIsKeepMountedDialogOpen(true)}>
          Always Mounted Dialog
        </Button>

        <Dialog
          open={isKeepMountedDialogOpen}
          onClose={(): void => setIsKeepMountedDialogOpen(false)}
          keepMounted
        >
          <DialogTitle>Keep-Mounted Dialog</DialogTitle>
          <DialogContent>
            <p>
              This dialog will always be mounted into the DOM, even when it is
              closed.
            </p>
            <p>
              By default, the content of a modal will only be mounted when the
              dialog is opened. However, if a modal takes a long time to render
              (for example, because it lazy-loads heavy components or fetches
              data on mount), or if you need to preserve its internal state
              (such as user input), it can be beneficial to keep it mounted at
              all times.
            </p>
          </DialogContent>
          <DialogActions>
            <Button onClick={(): void => setIsKeepMountedDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>

      <div className="box">
        <Button onClick={(): void => setIsCustomStyledDialogOpen(true)}>
          Styled API Dialog
        </Button>

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
            <Button onClick={(): void => setIsCustomStyledDialogOpen(false)}>
              Close
            </Button>
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
          <Button onClick={(): void => setIsContainerStyledDialogOpen(true)}>
            Container-Styled Dialog
          </Button>
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
            <Button onClick={(): void => setIsContainerStyledDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>

      <div className="box">
        <Button onClick={(): void => setIsPropStyledDialogOpen(true)}>
          Dialog with CSS Props
        </Button>

        <Dialog
          open={isPropStyleDialogOpen}
          onClose={(): void => setIsPropStyledDialogOpen(false)}
          overlayCss={css`
            background-color: rgba(75, 0, 130, 0.7);
            backdrop-filter: blur(4px);
          `}
          contentCss={css`
            background: linear-gradient(135deg, #ff9966, #ff5e62);
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            max-width: 450px;
          `}
        >
          <DialogTitle
            css={css`
              color: white;
              border-bottom: 1px solid rgba(255, 255, 255, 0.2);
              background-color: rgba(0, 0, 0, 0.1);
            `}
          >
            Dialog styled via props
          </DialogTitle>
          <DialogContent
            css={css`
              color: white;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
              padding: ${theme.spacing.lg}px;
            `}
          >
            <p>
              This dialog showcases how to use props to style different parts.
              This is an alternative to styled components.
            </p>
            <p>
              Notice the custom overlay with purple tint and blur effect, the
              gradient background of the dialog content, and the custom styles
              for each section.
            </p>
          </DialogContent>
          <DialogActions
            css={css`
              background-color: rgba(0, 0, 0, 0.1);
              border-top: 1px solid rgba(255, 255, 255, 0.2);
              padding: ${theme.spacing.md}px ${theme.spacing.lg}px;
            `}
          >
            <Button
              onClick={(): void => setIsPropStyledDialogOpen(false)}
              css={css`
                background-color: #ff5e62;
                color: white;
                border-color: white;
                &:hover:not(:disabled):not([aria-disabled]) {
                  background-color: white;
                  color: #ff5e62;
                  border-color: #ff5e62;
                }
              `}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>

      <div className="box">
        <Button onClick={openLoadingDialog}>Loading Dialog Example</Button>

        <Dialog
          open={isLoadingDialogOpen}
          loading={isDialogLoading}
          onClose={(): void => setIsLoadingDialogOpen(false)}
        >
          <DialogTitle>Data Loaded</DialogTitle>
          <DialogContent>
            <p>Custom content has now loaded</p>
          </DialogContent>
          <DialogActions>
            <Button onClick={(): void => setIsLoadingDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};
