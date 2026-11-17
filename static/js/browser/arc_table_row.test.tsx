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

import "@testing-library/jest-dom";

import { render } from "@testing-library/react";
import React from "react";

import { ArcTableRow } from "./arc_table_row";

describe("ArcTableRow", () => {
  it("renders literal HTTP/HTTPS URLs as external links with new-window icon", () => {
    const csvUrl =
      "https://data.gov.au/data/dataset/488ef6d4/download/grim-2026.csv";
    const { container } = render(
      <table>
        <tbody>
          <ArcTableRow
            propertyLabel="url"
            values={[{ text: csvUrl }]}
            hideProvenanceColumn={true}
          />
        </tbody>
      </table>
    );

    const externalLink = container.querySelector("a.external-url-link");
    expect(externalLink).not.toBeNull();
    expect(externalLink).toHaveAttribute("href", csvUrl);
    expect(externalLink).toHaveAttribute("target", "_blank");
    expect(externalLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(externalLink.textContent).toBe(csvUrl);
    expect(externalLink.querySelector("svg")).not.toBeNull();
  });

  it("renders non-URL literal values and unsafe schemes as plain text", () => {
    const { container } = render(
      <table>
        <tbody>
          <ArcTableRow
            propertyLabel="description"
            values={[
              { text: "National mortality counts from AIHW GRIM 2026" },
              { text: "javascript:alert(1)" },
            ]}
            hideProvenanceColumn={true}
          />
        </tbody>
      </table>
    );

    expect(container.querySelector("a.external-url-link")).toBeNull();
    const spans = Array.from(container.querySelectorAll(".arc-text span")).map(
      (s) => s.textContent
    );
    expect(spans).toEqual([
      "National mortality counts from AIHW GRIM 2026",
      "javascript:alert(1)",
    ]);
  });

  it("renders dcid values as internal browser links without external-url-link", () => {
    const { container } = render(
      <table>
        <tbody>
          <ArcTableRow
            propertyLabel="source"
            values={[
              {
                dcid: "dcsci/s/AIHW",
                text: "Australian Institute of Health and Welfare (AIHW)",
              },
            ]}
            hideProvenanceColumn={true}
          />
        </tbody>
      </table>
    );

    expect(container.querySelector("a.external-url-link")).toBeNull();
    const internalLink = container.querySelector(".arc-text a");
    expect(internalLink).toHaveAttribute("href", "/browser/dcsci/s/AIHW");
    expect(internalLink).not.toHaveAttribute("target");
  });
});
