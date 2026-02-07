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
  getEnclosedPlaceTypes,
  getEnclosedPlaceTypesWithMaps,
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

  it("should return child place types for a place", async () => {
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
});

describe("getEnclosedPlaceTypes", () => {
  it("Countries should return AA1, AA2, IPCCPlace_50", () => {
    const selectedPlace = {
      dcid: "country/CAN",
      name: "Canada",
      types: ["Country"],
    };
    const parentPlaces = [
      { dcid: "northamerica", name: "North America", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ];
    const expected = [
      "AdministrativeArea1",
      "AdministrativeArea2",
      "IPCCPlace_50",
    ];

    expect(getEnclosedPlaceTypes(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });
  it("AA1s should return AA2 and AA3", () => {
    const selectedPlace = {
      dcid: "wikidataId/Q43407",
      name: "Shandong",
      types: ["AdministrativeArea1"],
    };
    const parentPlaces = [
      { dcid: "country/CHN", name: "China", types: ["Country"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ];
    const expected = ["AdministrativeArea2", "AdministrativeArea3"];

    expect(getEnclosedPlaceTypes(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });
  it("USA should return State, County, IPCCPlace_50", () => {
    const selectedPlace = {
      dcid: "country/USA",
      name: "USA",
      types: ["Country"],
    };
    const parentPlaces = [
      { dcid: "northamerica", name: "North America", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ];
    const expected = ["State", "County", "IPCCPlace_50"];

    expect(getEnclosedPlaceTypes(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });
  it("US State should return County, City, Town", () => {
    const selectedPlace = {
      dcid: "state/AL",
      name: "Alabama",
      types: ["State"],
    };
    const parentPlaces = [
      { dcid: "country/USA", name: "USA", types: ["Country"] },
      { dcid: "northamerica", name: "North America", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ];
    const expected = ["County", "City", "Town", "Village"];

    expect(getEnclosedPlaceTypes(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });
  it("US County should return City, Town, Village, CensusTract, CensusZipCodeTabulationArea", () => {
    const selectedPlace = {
      dcid: "geoId/06037",
      name: "Los Angeles County",
      types: ["County"],
    };
    const parentPlaces = [
      { dcid: "geoId/06", name: "California", types: ["State"] },
      { dcid: "country/USA", name: "USA", types: ["Country"] },
      { dcid: "northamerica", name: "North America", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ];
    const expected = [
      "City",
      "Town",
      "Village",
      "CensusTract",
      "CensusZipCodeTabulationArea",
    ];

    expect(getEnclosedPlaceTypes(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });
  it("Europe should return Country, AA1, EurostatNUTS1, IPCCPlace_50", () => {
    const selectedPlace = {
      dcid: "europe",
      name: "Europe",
      types: ["Continent"],
    };
    const parentPlaces = [{ dcid: "earth", name: "Earth", types: ["Planet"] }];
    const expected = [
      "Country",
      "AdministrativeArea1",
      "EurostatNUTS1",
      "IPCCPlace_50",
    ];

    expect(getEnclosedPlaceTypes(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });
  it("European country should return AA1, AA2, EurostatNUTS1, EurostatNUTS2, IPCCPlace_50", () => {
    const selectedPlace = {
      dcid: "country/DEU",
      name: "Germany",
      types: ["Country"],
    };
    const parentPlaces = [
      { dcid: "europe", name: "Europe", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ];
    const expected = [
      "AdministrativeArea1",
      "AdministrativeArea2",
      "EurostatNUTS1",
      "EurostatNUTS2",
      "IPCCPlace_50",
    ];

    expect(getEnclosedPlaceTypes(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });
});

describe("getEnclosedPlaceTypesWithMaps", () => {
  it("Countries without AA1/AA2 data should only return IPCCPlace_50", () => {
    const selectedPlace = {
      dcid: "country/ABW",
      name: "Aruba",
      types: ["Country"],
    };
    const parentPlaces = [
      { dcid: "southamerica", name: "South America", types: ["Continent"] },
      { dcid: "Earth", name: "Earth", types: ["Planet"] },
    ];
    const expected = ["IPCCPlace_50"];

    expect(getEnclosedPlaceTypesWithMaps(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });

  it("Countries with AA1/AA2 data should return AA1, AA2, and IPCCPlace_50", () => {
    const selectedPlace = {
      dcid: "country/IND",
      name: "India",
      types: ["Country"],
    };
    const parentPlaces = [
      { dcid: "asia", name: "Asia", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ];
    const expected = [
      "AdministrativeArea1",
      "AdministrativeArea2",
      "IPCCPlace_50",
    ];

    expect(getEnclosedPlaceTypesWithMaps(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });

  it("Non-USA, non-Europe AdministrativeArea1 should return AdministrativeArea2, not USA/Europe only places", () => {
    const selectedPlace = {
      dcid: "wikidataId/Q43407",
      name: "Shandong", // Shandong, China
      types: ["AdministrativeArea1"],
    };
    const parentPlaces = [
      {
        dcid: "country/CHN",
        name: "China",
        types: ["Country"],
      },
      {
        dcid: "asia",
        name: "Asia",
        types: ["Continent"],
      },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ];

    const expected = ["AdministrativeArea2"];

    expect(getEnclosedPlaceTypesWithMaps(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });

  it("Pakistan should return AA1 and AA3 and IPCCPlace_50", () => {
    const selectedPlace = {
      dcid: "country/PAK",
      name: "Pakistan",
      types: ["Country"],
    };
    const parentPlaces = [
      { dcid: "asia", name: "Asia", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ];
    const expected = [
      "AdministrativeArea1",
      "AdministrativeArea3",
      "IPCCPlace_50",
    ];

    expect(getEnclosedPlaceTypesWithMaps(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });

  it("USA should return State, County, and IPCCPlace_50", () => {
    const selectedPlace = {
      dcid: "country/USA",
      name: "United States",
      types: ["Country"],
    };
    const parentPlaces = [
      { dcid: "northamerica", name: "North America", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ];
    const expected = ["State", "County", "IPCCPlace_50"];

    expect(getEnclosedPlaceTypesWithMaps(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });

  it("US State should return County, City, CensusTract, CensusZipCodeTabulationArea", () => {
    const selectedPlace = {
      dcid: "geoId/06",
      name: "California",
      types: ["State"],
    };
    const parentPlaces = [
      {
        dcid: "country/USA",
        name: "United States",
        types: ["Country"],
      },
      { dcid: "northamerica", name: "North America", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ];
    const expected = [
      "County",
      "City",
      "CensusTract",
      "CensusZipCodeTabulationArea",
    ];

    expect(getEnclosedPlaceTypesWithMaps(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });

  it("USA County should return City, CensusTract, CensusZipCodeTabulationArea", () => {
    const selectedPlace = {
      dcid: "geoId/06037",
      name: "Los Angeles County",
      types: ["County"],
    };
    const parentPlaces = [
      {
        dcid: "geoId/06",
        name: "California",
        types: ["State"],
      },
      {
        dcid: "country/USA",
        name: "United States",
        types: ["Country"],
      },
      { dcid: "northamerica", name: "North America", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ];
    const expected = ["City", "CensusTract", "CensusZipCodeTabulationArea"];

    expect(getEnclosedPlaceTypesWithMaps(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });

  it("Europe should return EurostatNUTS1, EurostatNUTS2, EurostatNUTS3, Country, and IPCCPlace_50", () => {
    const selectedPlace = {
      dcid: "europe",
      name: "Europe",
      types: ["Continent"],
    };
    const parentPlaces = [{ dcid: "earth", name: "Earth", types: ["Planet"] }];
    // Continent -> EurostatNUTS1, EurostatNUTS2, EurostatNUTS3 from EUROPE_CHILD_PLACE_TYPE_HIERARCHY
    // Continent -> Country, IPCCPlace_50 from ALL_PLACE_CHILD_TYPES
    const expected = [
      "Country",
      "EurostatNUTS1",
      "EurostatNUTS2",
      "EurostatNUTS3",
      "IPCCPlace_50",
    ];

    expect(getEnclosedPlaceTypesWithMaps(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });

  it("European countries should return EurostatNUTS1, EurostatNUTS2, EurostatNUTS3, and IPCCPlace_50", () => {
    const selectedPlace = {
      dcid: "country/FRA",
      name: "France",
      types: ["Country"],
    };
    const parentPlaces = [
      { dcid: "europe", name: "Europe", types: ["Continent"] },
      { dcid: "earth", name: "Earth", types: ["Planet"] },
    ];
    const expected = [
      "EurostatNUTS1",
      "EurostatNUTS2",
      "EurostatNUTS3",
      "IPCCPlace_50",
    ];

    expect(getEnclosedPlaceTypesWithMaps(selectedPlace, parentPlaces)).toEqual(
      expected
    );
  });
});

describe("getPlaceDcidCallback", () => {
  beforeEach(() => {
    (getNamedTypedPlace as jest.Mock).mockClear();
  });

  it("should do nothing if no callback is provided", async () => {
    const fn = getPlaceDcidCallback(null as any);
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
