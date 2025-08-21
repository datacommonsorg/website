/**
 * @jest-environment jsdom
 */
// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { updateHash } from "../../utils/url_utils";
import { DatasetSelector } from "./dataset_selector";

// Mock the updateHash function
jest.mock("../../utils/url_utils", () => ({
  updateHash: jest.fn(),
}));

const mockProps = {
  dataset: "dataset1",
  datasets: [
    { dcid: "dataset1", name: "Dataset 1" },
    { dcid: "dataset2", name: "Dataset 2" },
  ],
  source: "source1",
  sources: [
    { dcid: "source1", name: "Source 1" },
    { dcid: "source2", name: "Source 2" },
  ],
};

describe("DatasetSelector", () => {
  beforeEach(() => {
    // Clear mock calls before each test
    (updateHash as jest.Mock).mockClear();
  });

  it("renders the component with initial props", () => {
    render(<DatasetSelector {...mockProps} />);

    // Check if the labels and inputs are rendered
    expect(screen.getByText("Filter variables by")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Source 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dataset 1")).toBeInTheDocument();
  });

  it("calls updateHash when a new source is selected", () => {
    render(<DatasetSelector {...mockProps} />);

    const sourceSelector = screen.getByDisplayValue("Source 1");
    fireEvent.change(sourceSelector, { target: { value: "source2" } });

    expect(updateHash).toHaveBeenCalledWith({
      s: "source2",
      d: "",
    });
  });

  it("calls updateHash when a new dataset is selected", () => {
    render(<DatasetSelector {...mockProps} />);

    const datasetSelector = screen.getByDisplayValue("Dataset 1");
    fireEvent.change(datasetSelector, { target: { value: "dataset2" } });

    expect(updateHash).toHaveBeenCalledWith({
      s: "source1",
      d: "dataset2",
    });
  });
});
