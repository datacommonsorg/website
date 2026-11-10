/**
 * Copyright 2026 Google LLC
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

// The grammars are imported synchronously so that the tests exercise the
// tokenize path rather than the no-grammar fallback. The core must be loaded
// first because the language components register on the Prism global.
import "prismjs";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-python";
import "prismjs/components/prism-csv";

import { ThemeProvider } from "@emotion/react";
import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react";
import Prism from "prismjs";
import React from "react";

import theme from "../../../theme/theme";
import { CodeBlock, HighlightLanguage, SpecialTerms } from "./code_block";

const PAYLOAD = '<img src=x onerror="alert(document.domain)">';

function renderCodeBlock(
  code: string,
  language: HighlightLanguage,
  specialTerms?: SpecialTerms
): HTMLElement {
  const { container } = render(
    <ThemeProvider theme={theme}>
      <CodeBlock code={code} language={language} specialTerms={specialTerms} />
    </ThemeProvider>
  );
  return container;
}

describe("CodeBlock", () => {
  const cases: { language: HighlightLanguage; code: string }[] = [
    {
      language: "python",
      code: `client.observation.fetch(entity_dcids=["geoId/06", "${PAYLOAD}"])`,
    },
    {
      language: "bash",
      code: `curl -d '{"entity": {"dcids": ["geoId/06", "${PAYLOAD}"]}}'`,
    },
    { language: "csv", code: `place,value\n${PAYLOAD},1` },
  ];

  it.each(cases)(
    "renders HTML in $language code as text",
    ({ language, code }) => {
      // Test: HTML in the code is not injected into the DOM.
      // Situation: The code contains an img tag with an onerror handler, as
      // when an untrusted dcid is placed into generated API code or a CSV.
      // Expectation: The grammar is loaded, no img element exists, and the
      // payload appears verbatim in the rendered text.
      expect(Prism.languages[language]).toBeDefined();
      const container = renderCodeBlock(code, language);
      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector("code").textContent).toBe(code);
    }
  );

  it("encodes highlighted special terms", () => {
    // Test: Special-term highlighting still works on terms containing HTML.
    // Situation: The highlight term is an HTML tag inside a Python string. It
    // has no double quotes, so it stays within a single string token.
    // Expectation: The term is wrapped in a highlight span as text, and no
    // injected element exists.
    const term = "<b>geoId/06</b>";
    const code = `entity_dcids=["${term}"]`;
    const container = renderCodeBlock(code, "python", {
      highlight: [term],
    });
    expect(container.querySelector("b")).toBeNull();
    const highlighted = container.querySelector(
      ".token.special-term-highlight"
    );
    expect(highlighted).not.toBeNull();
    expect(highlighted.textContent).toBe(term);
  });
});
