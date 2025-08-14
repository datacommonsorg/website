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
 * A dialog component to display the API calls for a particular
 * set of observations (usually sourced from a chart tile). The dialog will
 * take a list of specs and a stat var name lookup, and render a curl
 * implementation of each API call.
 *
 * Note that this can be extended later to allow for other methods of
 * calling the API (a raw GET or Python and other languages).
 */

import { css, useTheme } from "@emotion/react";
import React, {
  ReactElement,
  ReactNode,
  RefObject,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { FormattedMessage } from "react-intl";

import { intl } from "../../../i18n/i18n";
import { chartComponentMessages } from "../../../i18n/i18n_chart_messages";
import { messages } from "../../../i18n/i18n_messages";
import {
  ObservationSpec,
  observationSpecToCurl,
} from "../../../shared/observation_specs";
import { Button } from "../../elements/button/button";
import { CopyToClipboardButton } from "../../elements/button/copy_to_clipboard_button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../../elements/dialog/dialog";

interface ApiDialogProps {
  //whether the dialog is open
  open: boolean;
  //whether the dialog is in loading state
  loading: boolean;
  //the close handler for the dialog
  onClose: () => void;
  //the list of observation specs the dialog will render
  specs: ObservationSpec[];
  //a lookup of stat var DCIDs to names
  statVarNameMap: Record<string, string>;
  // API root for data fetch; this will be used to create the
  // API endpoint call with the correct API root.
  // If not provided, it will be "https://api.datacommons.org"
  apiRoot?: string;
  // A ref to the chart container element.
  containerRef?: RefObject<HTMLElement>;
}

interface ApiCallTextAreaProps {
  // the value (the text of an API endpoint call) that will be
  // displayed in the text area.
  value: string;
}

const ApiCallTextArea = ({ value }: ApiCallTextAreaProps): ReactElement => {
  const theme = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div
      css={css`
        width: 100%;
        position: relative;
      `}
    >
      <CopyToClipboardButton
        valueToCopy={value}
        variant="light"
        size="md"
        css={css`
          position: absolute;
          top: ${theme.spacing.md}px;
          right: ${theme.spacing.md}px;
          z-index: 1;
          padding: ${theme.spacing.xs}px;
          cursor: pointer;
        `}
      ></CopyToClipboardButton>
      <textarea
        ref={textareaRef}
        css={css`
          width: 100%;
          border: 1px solid ${theme.colors.border.primary.light};
          color: ${theme.colors.text.tertiary.base};
          ${theme.radius.tertiary};
          ${theme.typography.family.code};
          ${theme.typography.text.sm};
          padding: ${theme.spacing.md}px;
          overflow-y: hidden;
          resize: none;
          &:focus {
            outline: none;
          }
        `}
        readOnly
        value={value}
      />
    </div>
  );
};

function getStatVarListString(
  dcids: string[],
  nameMap: Record<string, string>
): string {
  return dcids.map((id) => nameMap[id] || id).join(", ");
}

/**
 * A component factory to create a link component for use with FormattedMessage.
 *
 * @param {string} href The URL for the link.
 * @returns A React component function that takes text chunks and wraps them in a link.
 */
const createLinkComponent = (
  href: string
): ((chunks: ReactNode) => ReactElement) => {
  return function FormattedLink(chunks: ReactNode): ReactElement {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {chunks}
      </a>
    );
  };
};

export function ApiDialog({
  open,
  loading,
  onClose,
  specs,
  statVarNameMap,
  apiRoot,
  containerRef,
}: ApiDialogProps): ReactElement {
  const theme = useTheme();

  const apiCalls = useMemo(() => {
    return specs.map((s) => observationSpecToCurl(s, apiRoot));
  }, [specs, apiRoot]);

  const concatenatedEndpointCalls = useMemo(
    () => apiCalls.join("\n\n\n"),
    [apiCalls]
  );

  const numeratorSpecsCount = useMemo(
    () => specs.filter((s) => s.role !== "denominator").length,
    [specs]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      loading={loading}
      maxWidth="lg"
      fullWidth
      containerRef={containerRef}
    >
      <DialogTitle>
        {intl.formatMessage(chartComponentMessages.ApiDialogTitle)}
      </DialogTitle>
      <DialogContent>
        <p
          css={css`
            && {
              ${theme.typography.family.text}
              ${theme.typography.text.md}
              white-space: pre-wrap;
              word-break: break-word;
              margin-bottom: 0;
              a {
                white-space: pre-wrap;
                word-break: break-word;
              }
            }
          `}
        >
          <FormattedMessage
            {...chartComponentMessages.ApiDialogIntroduction}
            values={{
              apiKeyLink: createLinkComponent(
                "https://docs.datacommons.org/api/#obtain-an-api-key"
              ),
              apiDocsLink: createLinkComponent(
                "https://docs.datacommons.org/api/"
              ),
            }}
          />
        </p>

        {specs.map((observationSpec, index) => {
          const showHeader =
            observationSpec.role === "denominator" || numeratorSpecsCount > 1;
          const statVarNames = getStatVarListString(
            observationSpec.statVarDcids,
            statVarNameMap
          );
          const title =
            observationSpec.role === "denominator"
              ? `${statVarNames} ${chartComponentMessages.ApiDialogDenomHelperText}`
              : statVarNames;

          return (
            <div
              key={index}
              css={css`
                display: block;
                width: 100%;
                && > h3 {
                  ${theme.typography.family.text}
                  ${theme.typography.text.lg}
                  display: block;
                  margin: 0 0 ${theme.spacing.md}px 0;
                }
              `}
            >
              {showHeader && <h3>{title}</h3>}
              <ApiCallTextArea value={apiCalls[index] || ""} />
            </div>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>
          {intl.formatMessage(messages.close)}
        </Button>
        {!loading && specs.length > 0 && (
          <CopyToClipboardButton valueToCopy={concatenatedEndpointCalls}>
            {intl.formatMessage(
              specs.length === 1
                ? chartComponentMessages.ApiDialogCopy
                : chartComponentMessages.ApiDialogCopyAll
            )}
          </CopyToClipboardButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
