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
 * A component to display code with syntax highlighting. This component
 * uses Prism (prism.js) for syntax highlighting.
 *
 * To add languages to this component, you will:
 * - First add the language component import (a sample is in the comments below)
 * - Add the language to the HighlightLanguage type
 *
 * If you want to also add this language as an option in the API Dialog component,
 * see instructions in `ApiDialog.tsx`.
 */

// We disable lint's import ordering because the component imports must come after Prism itself.
/* eslint-disable simple-import-sort/imports */
import React, { useMemo } from "react";
import { css, useTheme } from "@emotion/react";

import Prism from "prismjs";

import "prismjs/components/prism-bash";
import "prismjs/components/prism-python";
/*
 When later adding a new languages, import it here:
 import "prismjs/components/prism-json";
 */

/* eslint-enable simple-import-sort/imports */

// The available languages for highlighting.
export type HighlightLanguage = "bash" | "python";

/**
 * A record of terms to be treated in a special way by the code block.
 * The current option is "highlighting", which will place a background
 * color behind the term.
 */
export interface SpecialTerms {
  // terms that should receive special highlighting in the code block
  highlight?: string[];
}

export interface CodeBlockProps {
  // The code block that will be rendered with highlighting
  code: string;
  // The language to be used for this code block
  language: HighlightLanguage;
  // An optional record of special terms to be highlighted in the code block
  specialTerms?: SpecialTerms;
  // An optional classname.
  className?: string;
}

// A context for a single render, containing the regex for its specific terms.
interface SpecialTermsContext {
  highlightRegex: RegExp | null;
}

/*
 Because prism hooks are global, we want to make sure that any given render will only
 ever use its own SpecialTermsContext. We do this by mapping a unique "language" per render
 cycle to the relevant context, using the renderIdCounter.
 */
const specialTermsContextMap = new Map<string, SpecialTermsContext>();
let renderIdCounter = 0;

let isWrapHookRegistered = false;

/**
 * This function registers the wrap hook. The hook will check if we have a special terms
 * context for this particular render cycle, and if so, use it to apply the rules of those
 * special terms (i.e., in the case of highlighting to add the highlight span).
 */
function registerWrapHook(): void {
  if (isWrapHookRegistered) return;

  Prism.hooks.add("wrap", (env: Prism.hooks.ElementEnvironment) => {
    const context = specialTermsContextMap.get(env.language);
    if (!context || !context.highlightRegex) {
      return;
    }

    if (typeof env.content !== "string") {
      return;
    }

    const regex = context.highlightRegex;
    regex.lastIndex = 0;
    env.content = env.content.replace(
      regex,
      (match: string) =>
        `<span class="token special-term-highlight">${match}</span>`
    );
  });

  isWrapHookRegistered = true;
}

/**
 * This function escapes special characters in a string for use in a regular expression.
 * There is a `RegExp.escape()` function as of May 2025. However, due
 * to its recentness, I added this polyfill.
 * @param str
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * This function builds a regular expression to search for any of the given list of special terms.
 * @param terms An array of special terms that will be searched for.
 */
function buildTermsRegex(terms: string[]): RegExp | null {
  if (!terms.length) return null;
  const body = `\\b(${terms.map(escapeRegex).join("|")})\\b`;
  return new RegExp(body, "g");
}

/**
 * This component is used internally by CodeBlock to render the actual
 * code block highlighted by Prism.
 */
function PrismRenderer({
  code,
  language,
  specialTerms,
  className,
}: CodeBlockProps): React.JSX.Element {
  const highlighted = useMemo(() => {
    const grammar = Prism.languages[language];
    if (!grammar) {
      return code;
    }

    const highlightTerms = (specialTerms?.highlight ?? []).filter(Boolean);
    if (!highlightTerms.length) {
      return Prism.highlight(code, grammar, language);
    }

    registerWrapHook();

    const callId = `highlight-${renderIdCounter++}`;
    const context: SpecialTermsContext = {
      highlightRegex: buildTermsRegex(highlightTerms),
    };

    // We set the special terms in the context map for the wrap hook to use.
    specialTermsContextMap.set(callId, context);

    try {
      return Prism.highlight(code, grammar, callId);
    } finally {
      // We can now remove the special terms from the map, as the highlighting is complete.
      specialTermsContextMap.delete(callId);
    }
  }, [code, language, specialTerms]);

  const finalClassName = `language-${language} ${className ?? ""}`;

  return (
    <pre className={finalClassName}>
      <code
        className={`language-${language}`}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </pre>
  );
}

export default function CodeBlock({
  code,
  language,
  specialTerms,
  className,
}: CodeBlockProps): React.JSX.Element {
  const theme = useTheme();

  // These are taken from Prism's default CSS file.
  // TODO (pablonoel): convert to DC colors and add a section for this to the theme.
  const container = css({
    position: "relative",

    "> pre[class*='language-']": {
      background: "#ffffff",
      color: "#2f2f2f",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "12px 14px",
      margin: 0,
      overflow: "auto",
      MozTabSize: 2,
      tabSize: 2,
      ...theme.typography.family.code,
      fontSize: "0.9rem",
      textShadow: "0 1px white",
      textAlign: "left",
      whiteSpace: "pre",
      wordSpacing: "normal",
      wordBreak: "normal",
      wordWrap: "normal",
      lineHeight: 1.5,
      WebkitHyphens: "none",
      MozHyphens: "none",
      msHyphens: "none",
      hyphens: "none",

      "& ::selection": {
        background:  theme.colors.text.code.selected,
      },

      ".token.comment, .token.prolog, .token.doctype, .token.cdata": {
        color: theme.colors.text.code.grey,
      },
      ".token.punctuation": {
        color: theme.colors.text.code.black,
      },
      ".token.namespace": {
        opacity: 0.7,
      },
      ".token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol, .token.deleted":
        {
          color: theme.colors.text.code.blue,
        },
      ".token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted":
        {
          color: theme.colors.text.code.green,
        },
      ".token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string":
        {
          color: theme.colors.text.code.orange,
          background: "hsla(0, 0%, 100%, .5)",
        },
      ".token.atrule, .token.attr-value, .token.keyword": {
        color: theme.colors.text.code.black,
      },
      ".token.function, .token.class-name": {
        color: theme.colors.text.code.blue,
      },
      ".token.regex, .token.important, .token.variable": {
        color: theme.colors.text.code.yellow,
      },
      ".token.important, .token.bold": {
        fontWeight: "bold",
      },
      ".token.italic": {
        fontStyle: "italic",
      },
      ".token.entity": {
        cursor: "help",
      },
      ".token.special-term-highlight": {
        backgroundColor: theme.colors.text.code.highlight,
        padding: "2px 3px",
        borderRadius: "3px",
      },
    },
  } as const);

  return (
    <div css={container} className={className}>
      <PrismRenderer
        code={code}
        language={language}
        specialTerms={specialTerms}
        className={className}
      />
    </div>
  );
}
