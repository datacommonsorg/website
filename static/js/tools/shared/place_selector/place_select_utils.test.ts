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

/**
 * Tests for place_select_utils.ts
 */
import {
  getNamedTypedPlace,
  getParentPlacesPromise,
} from "../../../utils/place_utils";
import {
  DEFAULT_HIERARCHY,
  DEFAULT_OVERRIDES,
  MAPS_DEFAULT_HIERARCHY,
  MAPS_OVERRIDES,
} from "./place_select_constants";
import {
  getHierarchyConfigForPlace,
  getPlaceDcidCallback,
  loadChildPlaceTypes,
} from "./place_select_utils";

// Mock API calls
jest.mock("../../../utils/place_utils", () => ({
  getNamedTypedPlace: jest.fn(),
  getParentPlacesPromise: jest.fn(),
}));

describe("loadChildPlaceTypes", () => {
  beforeEach(() => {
    (getParentPlacesPromise as jest.Mock).mockClear();
  });

  it("should return two levels of child place types for a place", async () => {
    (getParentPlacesPromise as jest.Mock).mockResolvedValue([
      { dcid: "southamerica", name: "South America", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ]);

    const selectedPlace = {
      dcid: "country/ABW",
      name: "Aruba",
      types: ["Country"],
    };
    const expected = [
      "AdministrativeArea1",
      "AdministrativeArea2",
      "IPCCPlace_50",
    ];

    const result = await loadChildPlaceTypes(selectedPlace);
    expect(getParentPlacesPromise).toHaveBeenCalledWith("country/ABW");
    expect(result).toEqual(expected);
  });

  it("When fetching child places with maps, should return only places that have maps", async () => {
    (getParentPlacesPromise as jest.Mock).mockResolvedValue([
      { dcid: "country/CHN", name: "China", types: ["Country"] },
      { dcid: "asia", name: "Asia", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ]);

    const selectedPlace = {
      dcid: "wikidataId/Q43407",
      name: "Shandong", // Shandong, China
      types: ["AdministrativeArea1"],
    };
    const expected = ["AdministrativeArea2"]; // AA3 is missing because it doesn't have maps

    const result = await loadChildPlaceTypes(selectedPlace, true);
    expect(getParentPlacesPromise).toHaveBeenCalledWith("wikidataId/Q43407");
    expect(result).toEqual(expected);
  });

  it("should return US-specific child place types for a US state", async () => {
    (getParentPlacesPromise as jest.Mock).mockResolvedValue([
      { dcid: "country/USA", name: "USA", types: ["Country"] },
      { dcid: "northamerica", name: "North America", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ]);

    const selectedPlace = {
      dcid: "geoId/06",
      name: "California",
      types: ["State"],
    };
    const expected = ["County", "City", "Town", "Village"];

    const result = await loadChildPlaceTypes(selectedPlace);
    expect(getParentPlacesPromise).toHaveBeenCalledWith("geoId/06");
    expect(result).toEqual(expected);
  });

  it("should return EurostatNUTS child place types for a European country", async () => {
    (getParentPlacesPromise as jest.Mock).mockResolvedValue([
      { dcid: "europe", name: "Europe", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ]);

    const selectedPlace = {
      dcid: "country/DEU",
      name: "Germany",
      types: ["Country"],
    };
    const expected = [
      "AdministrativeArea1",
      "AdministrativeArea2",
      "EurostatNUTS1",
      "EurostatNUTS2",
      "IPCCPlace_50",
    ];

    const result = await loadChildPlaceTypes(selectedPlace);
    expect(getParentPlacesPromise).toHaveBeenCalledWith("country/DEU");
    expect(result).toEqual(expected);
  });

  it("should return filtered EurostatNUTS child place types for a European country when requiring maps", async () => {
    (getParentPlacesPromise as jest.Mock).mockResolvedValue([
      { dcid: "europe", name: "Europe", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ]);

    const selectedPlace = {
      dcid: "country/FRA",
      name: "France",
      types: ["Country"],
    };
    const expected = [
      "EurostatNUTS1",
      "EurostatNUTS2",
      "EurostatNUTS3",
      "IPCCPlace_50",
    ];

    const result = await loadChildPlaceTypes(selectedPlace, true);
    expect(getParentPlacesPromise).toHaveBeenCalledWith("country/FRA");
    expect(result).toEqual(expected);
  });

  it("should return global defaults for Planet/Earth", async () => {
    (getParentPlacesPromise as jest.Mock).mockResolvedValue([]);

    const selectedPlace = {
      dcid: "Earth",
      name: "Earth",
      types: ["Planet"],
    };
    const expected = ["Continent", "Country"];

    const result = await loadChildPlaceTypes(selectedPlace);
    expect(getParentPlacesPromise).toHaveBeenCalledWith("Earth");
    expect(result).toEqual(expected);
  });
});

describe("getHierarchyConfigForPlace", () => {
  const arbitraryPlace = {
    dcid: "country/FRA",
    name: "France",
    types: ["Country"],
  };
  const usaPlace = { dcid: "country/USA", name: "USA", types: ["Country"] };
  const pakPlace = {
    dcid: "country/PAK",
    name: "Pakistan",
    types: ["Country"],
  };

  it("should return DEFAULT_HIERARCHY by default for places without overrides", () => {
    const result = getHierarchyConfigForPlace(arbitraryPlace, []);
    expect(result).toBe(DEFAULT_HIERARCHY);
  });

  it("should return MAPS_DEFAULT_HIERARCHY when requireMaps is true for places without overrides", () => {
    const result = getHierarchyConfigForPlace(arbitraryPlace, [], true);
    expect(result).toBe(MAPS_DEFAULT_HIERARCHY);
  });

  it("should return the country override default hierarchy if found", () => {
    const result = getHierarchyConfigForPlace(usaPlace, []);
    expect(result).toBe(DEFAULT_OVERRIDES["country/USA"]);
  });

  it("should return the country override maps hierarchy if found and requireMaps is true", () => {
    const result = getHierarchyConfigForPlace(usaPlace, [], true);
    expect(result).toBe(MAPS_OVERRIDES["country/USA"]);
  });

  it("should find the override by traversing parent places", () => {
    const california = {
      dcid: "geoId/06",
      name: "California",
      types: ["State"],
    };
    const result = getHierarchyConfigForPlace(california, [usaPlace]);
    expect(result).toBe(DEFAULT_OVERRIDES["country/USA"]);
  });

  it("should fallback to global default if the override object is missing the specific hierarchy type", () => {
    // Pakistan has a mapsHierarchy override, but no defaultHierarchy override
    const result = getHierarchyConfigForPlace(pakPlace, []);
    expect(result).toBe(DEFAULT_HIERARCHY);
  });
});

describe("getPlaceDcidCallback", () => {
  beforeEach(() => {
    (getNamedTypedPlace as jest.Mock).mockClear();
  });

  it("should do nothing if no callback is provided", async () => {
    const fn = getPlaceDcidCallback(null);
    await fn("country/USA");
    expect(getNamedTypedPlace).not.toHaveBeenCalled();
  });

  it("should fetch place and call the callback", async () => {
    const mockPlace = {
      dcid: "country/USA",
      name: "United States",
      types: ["Country"],
    };
    (getNamedTypedPlace as jest.Mock).mockResolvedValue(mockPlace);

    const mockCallback = jest.fn();
    const fn = getPlaceDcidCallback(mockCallback);

    await fn("country/USA");

    expect(getNamedTypedPlace).toHaveBeenCalledWith("country/USA");
    expect(mockCallback).toHaveBeenCalledWith(mockPlace);
  });
});
