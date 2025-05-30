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
 * Test for the TileMetadataModal component
 *
 * The test verifies the error path. It verifies that when fetchMetadata
 * throws an error, it shows the text "Error loading metadata." and
 * does not show the "Copy citation" button.
 */

import "@testing-library/jest-dom/extend-expect";

import { ThemeProvider } from "@emotion/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

import theme from "../../../theme/theme";
import * as metadataFetcher from "./metadata_fetcher";
import { TileMetadataModal } from "./tile_metadata_modal";

const mockDataCommonsClient: unknown = {};

jest.mock("../../../utils/data_commons_client", () => ({
  getDataCommonsClient: (): unknown => mockDataCommonsClient,
}));

// Silence the errors we expect from the console
const consoleError = jest.spyOn(console, "error").mockImplementation(() => {
  /* ignore */
});

afterAll(() => consoleError.mockRestore());

describe("TileMetadataModal - error path", () => {
  beforeEach(() => {
    jest
      .spyOn(metadataFetcher, "fetchMetadata")
      .mockRejectedValueOnce(new Error("Test fetch failure"));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows error message and hides copy citation when metadata fetch fails", async () => {
    render(
      <ThemeProvider theme={theme}>
        <TileMetadataModal
          facets={{}}
          statVarSpecs={[
            {
              denom: "",
              log: false,
              name: "Withdrawal Rate of Water: Irrigation",
              scaling: 1,
              statVar: "WithdrawalRate_Water_Irrigation",
              unit: "",
              date: "",
              facetId: "",
            },
          ]}
        />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText("Show metadata"));

    await waitFor(() =>
      expect(screen.getByText("Error loading metadata.")).toBeInTheDocument()
    );

    expect(screen.queryByText("Copy citation")).toBeNull();
  });
});
