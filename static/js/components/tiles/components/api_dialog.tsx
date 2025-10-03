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
 * take a list of specs and a stat var name lookup, and render examples
 * of the API call in the languages given by the language specs.
 *
 * To add a new language, perform the following steps:
 * - Create the generator function in `observation_specs`. This might be
 *   called: `observationSpecsToPythonScript`. This function takes either
 *   a single or multiple observation specs and renders the language
 *   specific endpoints or scripts.
 * - Add the language to the LANGUAGE_SPEC array. See instructions in that
 *   section for information on how to create that object.
 * - If the language is not already set up for syntax highlighting in
 *   code_block.tsx, go to that component and add syntax highlighting for
 *   that language. Instructions are provided in that file.
 *
 * Note that this can be extended later to allow for other methods of
 * calling the API (a raw GET or Python and other languages).
 */

import { css, useTheme } from "@emotion/react";
import React, {
  ReactElement,
  ReactNode,
  RefObject,
  useMemo,
  useState,
} from "react";
import { FormattedMessage } from "react-intl";

import { intl } from "../../../i18n/i18n";
import { chartComponentMessages } from "../../../i18n/i18n_chart_messages";
import { messages } from "../../../i18n/i18n_messages";
import {
  buildObservationSpecManifest,
  isCustomDataCommons,
  ObservationSpec,
  observationSpecsToPythonScript,
  observationSpecToCurl,
} from "../../../shared/observation_specs";
import { Button } from "../../elements/button/button";
import { CopyToClipboardButton } from "../../elements/button/copy_to_clipboard_button";
import {
  CodeBlock,
  HighlightLanguage,
  SpecialTerms,
} from "../../elements/code/code_block";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../../elements/dialog/dialog";

type SingleSpecGenerator = (spec: ObservationSpec, apiRoot?: string) => string;
type MultiSpecGenerator = (
  specs: ObservationSpec[],
  statVarNameMap: Record<string, string>,
  apiRoot?: string
) => string;

/**
  This interface provides the language specifications for rendering example API calls to users in
  the API dialog.

  The `displayStyle` determines how a given language behaves when we have multiple endpoints.

  `single`: All endpoints are rendered together in a single block of code. This is suitable
      for languages like python or R, where we present a script that can contain multiple endpoints.
  `multiple` Each endpoint is shown in its own section and can be copied independently. This is
      suitable for cURL or raw GET requests, where each call stands on its own.

  The generator is the function that takes the observation spec and transforms it into an example
  for the target language.
    `single` languages require a generator with a `MultiSpecGenerator` shape (combine multiple specs
      into a single script)
    `multiple` languages require a generator with a `SingleSpecGenerator` shape (one block per spec).
 */
type LanguageSpec =
  | {
      slug: string;
      name: string;
      displayStyle: "multiple";
      generator: SingleSpecGenerator;
      highlightLanguage: HighlightLanguage;
    }
  | {
      slug: string;
      name: string;
      displayStyle: "single";
      generator: MultiSpecGenerator;
      highlightLanguage: HighlightLanguage;
    };

const LANGUAGE_SPEC: LanguageSpec[] = [
  {
    slug: "python",
    name: "Python",
    displayStyle: "single",
    generator: observationSpecsToPythonScript,
    highlightLanguage: "python",
  },
  {
    slug: "curl",
    name: "cURL",
    displayStyle: "multiple",
    generator: observationSpecToCurl,
    highlightLanguage: "bash",
  },
];

type LanguageSlug = typeof LANGUAGE_SPEC[number]["slug"];

const DEFAULT_LANGUAGE_SLUG = "python";

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
  // API root for data fetch; if provided, this will be used to create
  // the API endpoint call with that API root.
  apiRoot?: string;
  // A ref to the chart container element.
  containerRef?: RefObject<HTMLElement>;
}

interface ApiCallCodeBlockProps {
  // the value (the text of an API endpoint call) that will be
  // displayed in the code block area.
  value: string;
  // the language of the code block for syntax highlighting
  language: HighlightLanguage;
  // An optional record of special terms to be highlighted in the code block
  specialTerms?: SpecialTerms;
}

function ApiCallCodeBlock({
  value,
  language,
  specialTerms,
}: ApiCallCodeBlockProps): ReactElement {
  const theme = useTheme();

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
      />
      <CodeBlock language={language} code={value} specialTerms={specialTerms} />
    </div>
  );
}

interface ApiLanguageContentProps {
  // the spec for the language for this particular content section
  lang: LanguageSpec;
  // whether this is the block for the currently selected language
  isCurrent: boolean;
  //the list of observation specs the content block will render
  specs: ObservationSpec[];
  //a lookup of stat var DCIDs to names
  statVarNameMap: Record<string, string>;
  // API root for data fetch; if provided, this will be used to create
  // the API endpoint call with that API root.
  apiRoot?: string;
  // the number of numerator specs associated with the content block
  numeratorSpecsCount: number;
  // An optional record of special terms to be highlighted in the code block
  specialTerms?: SpecialTerms;
}

const ApiLanguageContent = ({
  lang,
  isCurrent,
  specs,
  statVarNameMap,
  numeratorSpecsCount,
  apiRoot,
  specialTerms,
}: ApiLanguageContentProps): ReactElement => {
  const theme = useTheme();

  if (lang.displayStyle === "multiple") {
    return (
      <div
        key={lang.slug}
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${theme.spacing.lg}px;
          transition: opacity 0.3s ease-in-out;
          opacity: ${isCurrent ? 1 : 0};
          height: ${isCurrent ? "100%" : "0"};
          overflow: hidden;
        `}
      >
        {specs.map((observationSpec, index) => {
          const apiCall = (lang.generator as SingleSpecGenerator)(
            observationSpec,
            apiRoot
          );
          const showHeader =
            observationSpec.role === "denominator" || numeratorSpecsCount > 1;
          const statVarNames = getStatVarListString(
            observationSpec.statVarDcids,
            statVarNameMap
          );
          const title =
            observationSpec.role === "denominator"
              ? `${statVarNames} ${intl.formatMessage(
                  chartComponentMessages.ApiDialogDenomHelperText
                )}`
              : statVarNames;

          return (
            <div
              key={`${lang.slug}-${index}`}
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
              <ApiCallCodeBlock
                value={apiCall}
                language={lang.highlightLanguage}
                specialTerms={specialTerms}
              />
            </div>
          );
        })}
      </div>
    );
  } else {
    const apiCall = (lang.generator as MultiSpecGenerator)(
      specs,
      statVarNameMap,
      apiRoot
    );
    return (
      <div
        key={lang.slug}
        css={css`
          transition: opacity 0.3s ease-in-out;
          opacity: ${isCurrent ? 1 : 0};
          height: ${isCurrent ? "100%" : "0"};
          overflow: hidden;
        `}
      >
        <ApiCallCodeBlock
          value={apiCall}
          language={lang.highlightLanguage}
          specialTerms={specialTerms}
        />
      </div>
    );
  }
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
  const [apiLanguage, setApiLanguage] = useState<LanguageSlug>(
    DEFAULT_LANGUAGE_SLUG
  );

  const currentLanguageSpec =
    LANGUAGE_SPEC.find((lang) => lang.slug === apiLanguage) || LANGUAGE_SPEC[0];

  const apiContent = useMemo(() => {
    if (currentLanguageSpec.displayStyle === "multiple") {
      return specs.map((s) => currentLanguageSpec.generator(s, apiRoot));
    } else {
      return currentLanguageSpec.generator(specs, statVarNameMap, apiRoot);
    }
  }, [specs, apiRoot, statVarNameMap, currentLanguageSpec]);

  const specialTerms = useMemo((): SpecialTerms => {
    const manifest = buildObservationSpecManifest(specs);
    return {
      highlight: [
        ...manifest.entities,
        ...manifest.entityExpressions,
        ...manifest.statVars,
      ],
    };
  }, [specs]);

  const concatenatedEndpointCalls = useMemo(() => {
    if (Array.isArray(apiContent)) {
      return apiContent.join("\n\n\n");
    }
    return apiContent;
  }, [apiContent]);

  const numeratorSpecsCount = useMemo(
    () => specs.filter((s) => s.role !== "denominator").length,
    [specs]
  );

  const isCustomDc = isCustomDataCommons(apiRoot);

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
            {...(isCustomDc
              ? chartComponentMessages.ApiDialogIntroductionCustomDc
              : chartComponentMessages.ApiDialogIntroduction)}
            values={{
              apiDocsLink: createLinkComponent(
                "https://docs.datacommons.org/api/"
              ),
              ...(!isCustomDc && {
                apiKeyLink: createLinkComponent(
                  "https://docs.datacommons.org/api/#obtain-an-api-key"
                ),
                apiKeyPlaceholder: (
                  <code
                    css={css`
                      && {
                        padding: 1px ${theme.spacing.xs}px;
                        ${theme.typography.family.code}}
                        font-size: 100%;
                        color: ${theme.colors.text.code.base};
                      }
                    `}
                  >
                    API_KEY
                  </code>
                ),
              }),
            }}
          />
        </p>

        <div
          css={css`
            && {
              position: relative;
              display: flex;
              align-items: center;
            }
          `}
        >
          <label
            css={css`
              && {
                ${theme.typography.family.text}
                ${theme.typography.text.sm}
                position: relative;
                font-weight: 600;
                display: flex;
                gap: 16px;
                align-items: center;
              }
              &&::after {
                content: "";
                position: absolute;
                // This is a base64 rendering of the Material "arrow_drop_down" icon
                background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSIyNHB4IiBmaWxsPSIjMDAwMDAwIj48cGF0aCBkPSJNNDgwLTM2MCAyODAtNTYwaDQwMEw0ODAtMzYwWiIvPjwvc3ZnPg==);
                background-repeat: no-repeat;
                background-position: center center;
                width: 16px;
                height: 16px;
                right: 6px;
                top: 7px;
                pointer-events: none;
                z-index: 1;
              }
            `}
          >
            <span
              css={css`
                ${theme.typography.family.text}
                ${theme.typography.text.sm}
                font-weight: 600;
                margin: 0;
              `}
            >
              Language:
            </span>

            <select
              id="api-language-selector"
              value={apiLanguage}
              onChange={(e): void => setApiLanguage(e.target.value)}
              css={css`
                && {
                  appearance: none;
                  z-index: 1;
                  cursor: pointer;
                  ${theme.typography.family.text}
                  ${theme.typography.text.sm}
                  ${theme.radius.quaternary}
                  border: 1px solid ${theme.colors.border.primary.light};
                  padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
                  background: white;
                  min-width: 15ch;
                  max-width: 30ch;
                }
              `}
            >
              {LANGUAGE_SPEC.map((lang) => (
                <option key={lang.slug} value={lang.slug}>
                  {lang.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          css={css`
            display: flex;
            flex-direction: column;
            position: relative;
          `}
        >
          {LANGUAGE_SPEC.map((lang) => (
            <ApiLanguageContent
              key={lang.slug}
              lang={lang}
              isCurrent={lang.slug === apiLanguage}
              specs={specs}
              statVarNameMap={statVarNameMap}
              numeratorSpecsCount={numeratorSpecsCount}
              apiRoot={apiRoot}
              specialTerms={specialTerms}
            />
          ))}
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>
          {intl.formatMessage(messages.close)}
        </Button>
        {!loading && specs.length > 0 && (
          <CopyToClipboardButton valueToCopy={concatenatedEndpointCalls}>
            {intl.formatMessage(
              currentLanguageSpec.displayStyle === "multiple" &&
                specs.length > 1
                ? chartComponentMessages.ApiDialogCopyAll
                : chartComponentMessages.ApiDialogCopy
            )}
          </CopyToClipboardButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
