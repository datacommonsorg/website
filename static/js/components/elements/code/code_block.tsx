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

import { css, useTheme } from "@emotion/react";
import Prism from "prismjs";
import React, { useMemo } from "react";

void import("prismjs/components/prism-bash");
void import("prismjs/components/prism-python");
void import("prismjs/components/prism-csv");

/*
 When later adding a new languages, import it here:
 import "prismjs/components/prism-json";
 */

// The available languages for highlighting.
export type HighlightLanguage = "bash" | "python" | "csv";

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

type PrismTokenStream = (string | Prism.Token)[];
type PrismNode = string | Prism.Token | PrismTokenStream;

/**
 * A guard to determine if a node is a Prism.Token.
 */
function isPrismToken(node: unknown): node is Prism.Token {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    "content" in node
  );
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
  const body = `(${terms.map(escapeRegex).join("|")})`;
  return new RegExp(body, "g");
}

/**
 * This function processes a token stream. When it finds a string,
 * it splits it by the terms we want to highlight and wraps those in span tags.
 * @param node
 * @param regex
 * @param termsSet
 */
function processTokenStream(
  node: PrismNode,
  regex: RegExp | null,
  termsSet: Set<string>
): PrismTokenStream {
  if (isPrismToken(node)) {
    // If the node is a token, we apply this function to its content and return a new one
    const processedContent = processTokenStream(node.content, regex, termsSet);
    return [new Prism.Token(node.type, processedContent, node.alias)];
  }

  if (Array.isArray(node)) {
    // If the node is already an array, we process each item.
    return node.flatMap((item) => processTokenStream(item, regex, termsSet));
  }

  if (typeof node === "string") {
    if (!regex || termsSet.size === 0) {
      return [node];
    }

    const parts = node.split(regex);

    return parts.map((part, index) => {
      // We are splitting by the terms we want (and telling regex to include them).
      // Therefore, every odd entry will be a split (a term we want)
      if (part && termsSet.has(part) && index % 2 === 1) {
        return new Prism.Token("special-term-highlight", part);
      }
      return part;
    });
  }

  return [];
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
    if (
      language === "csv" &&
      Prism.languages.csv &&
      !Prism.languages.csv.string
    ) {
      Prism.languages.insertBefore("csv", "value", {
        string: {
          pattern: /"(?:[^"]|"")*"/,
          alias: "value",
        },
      });
    }

    const grammar = Prism.languages[language];
    if (!grammar) {
      return Prism.Token.stringify(Prism.util.encode(code), language);
    }

    const tokens = Prism.tokenize(code, grammar);

    let processedTokens: PrismTokenStream;
    const highlightTerms = (specialTerms?.highlight ?? []).filter(Boolean);

    // We check if we have special terms to highlight and if so, process them.
    if (!highlightTerms.length) {
      processedTokens = tokens;
    } else {
      const sortedHighlightTerms = [...highlightTerms].sort(
        (a, b) => b.length - a.length
      );
      const termsRegex = buildTermsRegex(sortedHighlightTerms);
      const termsSet = new Set(sortedHighlightTerms);
      processedTokens = processTokenStream(tokens, termsRegex, termsSet);
    }

    // If we are handling a CSV, we apply header tags to the first line
    if (language === "csv") {
      let firstLine = true;
      for (const token of processedTokens) {
        if (!firstLine) break;

        if (typeof token === "string" && /\r\n|[\r\n]/.test(token)) {
          firstLine = false;
          continue;
        }

        if (isPrismToken(token)) {
          const newAlias = "header";
          if (Array.isArray(token.alias)) {
            if (!token.alias.includes(newAlias)) {
              token.alias.push(newAlias);
            }
          } else if (token.alias) {
            if (token.alias !== newAlias) {
              token.alias = [token.alias, newAlias];
            }
          } else {
            token.alias = newAlias;
          }
        }
      }
    }
    return Prism.Token.stringify(processedTokens, language);
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

export function CodeBlock({
  code,
  language,
  specialTerms,
  className,
}: CodeBlockProps): React.JSX.Element {
  const theme = useTheme();

  const container = css({
    position: "relative",

    "> pre[class*='language-']": {
      background: theme.codeHighlight.background,
      color: theme.codeHighlight.text,
      border: `1px solid ${theme.codeHighlight.border}`,
      borderRadius: "8px",
      padding: "12px 14px",
      margin: 0,
      overflow: "auto",
      MozTabSize: 2,
      tabSize: 2,
      ...theme.typography.family.code,
      fontSize: "0.9rem",
      textShadow: `0 1px ${theme.codeHighlight.background}`,
      textAlign: "left",
      whiteSpace: "pre-wrap",
      wordSpacing: "normal",
      wordBreak: "normal",
      wordWrap: "break-word",
      lineHeight: 1.5,
      WebkitHyphens: "none",
      MozHyphens: "none",
      msHyphens: "none",
      hyphens: "none",

      "> code": {
        ...theme.typography.family.code,
        color: theme.codeHighlight.text,
      },

      "& ::selection": {
        background: theme.codeHighlight.selection,
      },

      ".token.comment, .token.prolog, .token.doctype, .token.cdata": {
        color: theme.codeHighlight.comment,
      },
      ".token.punctuation": {
        color: theme.codeHighlight.punctuation,
      },

      "&.language-csv .token.value.string.header, &.language-csv .token.value.header":
        {
          color: theme.codeHighlight.csvHeader,
        },
      "&.language-csv .token.punctuation": {
        color: theme.codeHighlight.csvSeparator,
      },
      "&.language-csv .token.value": {
        color: theme.codeHighlight.csvValue,
      },
      "&.language-csv .token.value.string": {
        color: theme.codeHighlight.csvStringValue,
      },

      ".token.namespace": {
        opacity: 0.7,
      },
      ".token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol, .token.deleted":
        {
          color: theme.codeHighlight.property,
        },
      ".token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted":
        {
          color: theme.codeHighlight.selector,
        },
      ".token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string":
        {
          color: theme.codeHighlight.operator,
          background: "hsla(0, 0%, 100%, .5)",
        },
      ".token.atrule, .token.attr-value, .token.keyword": {
        color: theme.codeHighlight.atrule,
      },
      ".token.function, .token.class-name": {
        color: theme.codeHighlight.function,
      },
      ".token.regex, .token.important, .token.variable": {
        color: theme.codeHighlight.regex,
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
        backgroundColor: theme.codeHighlight.highlight,
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
