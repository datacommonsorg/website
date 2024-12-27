/**
 * Copyright 2022 Google LLC
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
import _ from "lodash";

import {
  ConfidenceLevel,
  DCProperty,
  DCType,
  DetectedDetails,
  TypeProperty,
} from "../types";
import countriesJSON from "./country_mappings.json";
import statesJSON from "./state_mappings.json";

const MIN_HIGH_CONF_DETECT = 0.4;
const SUPPORTED_PLACE_TYPES = new Set<string>(["Country", "State"]);

// All supported Place types must be encoded below.
const PLACE_TYPES: DCType[] = [
  { dcid: "GeoCoordinates", displayName: "Geo Coordinates" },
  { dcid: "State", displayName: "State" },
  { dcid: "Country", displayName: "Country" },
  { dcid: "Province", displayName: "Province" },
  { dcid: "Municipality", displayName: "Municipality" },
  { dcid: "County", displayName: "County" },
  { dcid: "City", displayName: "City" },
];

// All supported Place properties must be encoded below.
const PLACE_PROPERTIES: DCProperty[] = [
  { dcid: "name", displayName: "Name" },
  { dcid: "longitude", displayName: "Longitude" },
  { dcid: "latitude", displayName: "Latitude" },
  { dcid: "isoCode", displayName: "ISO Code" },
  { dcid: "countryAlpha3Code", displayName: "Alpha 3 Code" },
  { dcid: "countryNumericCode", displayName: "Numeric Code" },
  { dcid: "fips52AlphaCode", displayName: "US State Alpha Code" },
  { dcid: "geoId", displayName: "FIPS Code" },
];

// Helper interface to refer to the place types and place properties.
interface TPName {
  tName: string;
  pName: string;
}

function toAlphaNumericAndLower(s: string): string {
  return _.isEmpty(s) ? null : s.toLowerCase().replace(/[^a-z0-9]/gi, "");
}

/**
 * A PlaceDetector objected is meant to be initialized once. It provides
 * convenience access to all place types and their supported formats. It also
 * supports detecting the place type for each individual column (a header and
 * a list of string values).
 */
export class PlaceDetector {
  // Country specific.
  countryNames: Set<string>;
  countryISO: Set<string>;
  countryAbbrv3: Set<string>;
  countryNumeric: Set<string>;

  // State specific.
  stateNames: Set<string>;
  stateISO: Set<string>;
  stateFipsAlpha: Set<string>;
  stateFipsCode: Set<string>;

  // Convenience in-memory maps of types and properties where the keys are their
  // respective DC Names.
  placeTypes: Map<string, DCType>;
  placeProperties: Map<string, DCProperty>;

  // A set of all place types and their associated properties.
  placeTypesAndProperties: Set<TypeProperty>;

  // Mapping between Place types and supported properties associated with each
  // type. The keys of columnToTypePropertyMapping are matched against the column
  // headers in the user csv files. If a column header matches a key in
  // columnToTypePropertyMapping then the associated value in
  // columnToTypePropertyMapping is the inferred location type and property.
  static columnToTypePropertyMapping = new Map<string, Array<TPName>>([
    ["longitude", [{ tName: "GeoCoordinates", pName: "longitude" }]],
    ["latitude", [{ tName: "GeoCoordinates", pName: "latitude" }]],
    ["latlon", [{ tName: "GeoCoordinates", pName: "name" }]],
    ["geocoordinates", [{ tName: "GeoCoordinates", pName: "name" }]],
    [
      "country",
      [
        { tName: "Country", pName: "name" },
        { tName: "Country", pName: "isoCode" },
        { tName: "Country", pName: "countryAlpha3Code" },
        { tName: "Country", pName: "countryNumericCode" },
      ],
    ],
    [
      "state",
      [
        { tName: "State", pName: "name" },
        { tName: "State", pName: "isoCode" },
        { tName: "State", pName: "fips52AlphaCode" },
        { tName: "State", pName: "geoId" },
      ],
    ],
    ["province", [{ tName: "Province", pName: "name" }]],
    ["municipality", [{ tName: "Municipality", pName: "name" }]],
    ["county", [{ tName: "County", pName: "name" }]],
    ["city", [{ tName: "City", pName: "name" }]],
  ]);

  constructor() {
    // Set the various class attributes.
    this.preProcessCountries();
    this.preProcessUSStates();
    this.setValidPlaceTypesAndProperties();
  }

  /**
   * Processes columnToTypePropertyMapping to set the placeTypesAndProperties attribute.
   */
  setValidPlaceTypesAndProperties(): void {
    // Process the PLACE_TYPES.
    this.placeTypes = new Map<string, DCType>();
    for (const t of PLACE_TYPES) {
      this.placeTypes.set(t.dcid, t);
    }
    // Process the PLACE_PROPERTIES.
    this.placeProperties = new Map<string, DCProperty>();
    for (const p of PLACE_PROPERTIES) {
      this.placeProperties.set(p.dcid, p);
    }

    // Process the columnToTypePropertyMapping.
    const tpMap = new Map<string, TypeProperty>();
    const valArray = Array.from(
      PlaceDetector.columnToTypePropertyMapping.values()
    );
    for (const tpNames of valArray) {
      for (const tp of tpNames) {
        // Create unique keys using a combination of the type and property.
        const key = (tp.tName + tp.pName).toLowerCase();
        if (tpMap.has(key)) {
          continue;
        }
        tpMap.set(key, {
          dcType: this.placeTypes.get(tp.tName),
          dcProperty: this.placeProperties.get(tp.pName),
        });
      }
    }
    this.placeTypesAndProperties = new Set(tpMap.values());
  }

  /**
   * Returns the TypeProperty objects which are currently supported.
   */
  getSupportedPlaceTypesAndProperties(): Set<TypeProperty> {
    const supported = new Set<TypeProperty>();

    for (const tp of Array.from(this.placeTypesAndProperties)) {
      if (SUPPORTED_PLACE_TYPES.has(tp.dcType.dcid)) {
        supported.add(tp);
      }
    }
    return supported;
  }

  /**
   * Process the countriesJSON object to generate the required sets.
   */
  preProcessCountries(): void {
    // TODO: verify that country names do not have special chars. If they do,
    // work out a separate solution.
    this.countryNames = new Set<string>();
    this.countryISO = new Set<string>();
    this.countryAbbrv3 = new Set<string>();
    this.countryNumeric = new Set<string>();

    for (const country of countriesJSON) {
      this.countryNames.add(toAlphaNumericAndLower(country.name));

      if (country.iso_code != null) {
        this.countryISO.add(toAlphaNumericAndLower(country.iso_code));
      }
      if (country.country_alpha_3_code != null) {
        this.countryAbbrv3.add(
          toAlphaNumericAndLower(country.country_alpha_3_code)
        );
      }
      if (country.country_numeric_code != null) {
        this.countryNumeric.add(
          toAlphaNumericAndLower(country.country_numeric_code)
        );
      }
    }
  }

  /**
   * Process the statesJSON object to generate the required sets.
   */
  preProcessUSStates(): void {
    this.stateNames = new Set<string>();
    this.stateISO = new Set<string>();
    this.stateFipsAlpha = new Set<string>();
    this.stateFipsCode = new Set<string>();

    for (const state of statesJSON) {
      this.stateNames.add(toAlphaNumericAndLower(state.name));

      if (state.iso_code != null) {
        this.stateISO.add(state.iso_code.toLowerCase());
      }

      // FIPS codes are only relevant for the Unites States.
      if (!_.isEmpty(state.id) && state.iso_code.startsWith("US")) {
        this.stateFipsCode.add(toAlphaNumericAndLower(state.id.split("/")[1]));
      }
      if (!_.isEmpty(state.fips52AlphaCode)) {
        this.stateFipsAlpha.add(toAlphaNumericAndLower(state.fips52AlphaCode));
      }
    }
  }

  /**
   * The low confidence column detector simply checks if the column header
   * (string) matches one of the keys in columnToTypePropertyMapping.
   * The header is converted to lower case and only alphanumeric chars are used.
   * If there is no match, the return value is null.
   *
   * @param header the name of the column.
   *
   * @return the TypeProperty object (with no PlaceProperty) or null if nothing
   *  can be determined with low confidence.
   */
  detectLowConfidence(header: string): TypeProperty {
    const h = header.toLowerCase().replace(/[^a-z0-9]/gi, "");
    if (PlaceDetector.columnToTypePropertyMapping.has(h)) {
      // Use any of the TPNames in the Array<TPName> associated with the
      // value associated with 'h'. All the TPNames associated with 'h' are
      // expected to have the same place type (tName).
      const typeName =
        PlaceDetector.columnToTypePropertyMapping.get(h)[0].tName;

      // Use null for the PlaceProperty because we are only matching types
      // for the low confidence cases.
      return { dcType: this.placeTypes.get(typeName) };
    }
    return null;
  }

  /**
   * Country is detected with high confidence if > MIN_HIGH_CONF_DETECT of the
   * non-null column values match one of the country format (property) arrays.
   * If country is not detected, null is returned.
   * If country is detected, the TypeProperty is returned.
   *
   * @param column: an array of strings representing the column values.
   *
   * @return the TypeProperty object or null if nothing can be determined with
   *  high confidence.
   */
  detectCountryHighConf(column: Array<string>): TypeProperty {
    let numValid = 0;

    const counters = new Map<string, number>();
    counters["name"] = 0;
    counters["isoCode"] = 0;
    counters["countryAlpha3Code"] = 0;
    counters["countryNumericCode"] = 0;
    for (const cVal of column) {
      if (cVal == null) {
        continue;
      }
      const v = toAlphaNumericAndLower(cVal);
      numValid++;

      if (this.countryNames.has(v)) {
        counters["name"]++;
      } else if (this.countryISO.has(v)) {
        counters["isoCode"]++;
      } else if (this.countryAbbrv3.has(v)) {
        counters["countryAlpha3Code"]++;
      } else if (this.countryNumeric.has(v)) {
        counters["countryNumericCode"]++;
      }
    }

    // Determine the detected TypeProperty. Type is Country for all.
    for (const [key, value] of Object.entries(counters)) {
      if (value > numValid * MIN_HIGH_CONF_DETECT) {
        return {
          dcType: this.placeTypes.get("Country"),
          dcProperty: this.placeProperties.get(key),
        };
      }
    }
    return null;
  }

  /**
   * State is detected with high confidence if > MIN_HIGH_CONF_DETECT of the
   * non-null column values match one of the state format (property) arrays.
   * If state is not detected, null is returned.
   * If state is detected, the TypeProperty is returned.
   *
   * @param column: an array of strings representing the column values.
   *
   * @return the TypeProperty object or null if nothing can be determined with
   *  high confidence.
   */
  detectStateHighConf(column: Array<string>): TypeProperty {
    let numValid = 0;

    const counters = new Map<string, number>();
    counters["name"] = 0;
    counters["isoCode"] = 0;
    counters["fips52AlphaCode"] = 0;
    counters["geoId"] = 0;
    for (const cVal of column) {
      if (_.isEmpty(cVal)) {
        continue;
      }
      const v = toAlphaNumericAndLower(cVal);
      numValid++;

      if (this.stateNames.has(v)) {
        counters["name"]++;
      } else if (this.stateISO.has(cVal.toLowerCase())) {
        // Note: this matches lower case only.
        counters["isoCode"]++;
      } else if (this.stateFipsAlpha.has(v)) {
        counters["fips52AlphaCode"]++;
      } else if (this.stateFipsCode.has(v)) {
        counters["geoId"]++;
      }
    }

    // Determine the detected TypeProperty. Type is State for all.
    for (const [key, value] of Object.entries(counters)) {
      if (value > numValid * MIN_HIGH_CONF_DETECT) {
        return {
          dcType: this.placeTypes.get("State"),
          dcProperty: this.placeProperties.get(key),
        };
      }
    }
    return null;
  }

  /**
   * Detects with high confidence the type and property for a Place.
   * If a place cannot be detected, returns null.
   * Currently only supports detecting country (place type).
   *
   * @param header the name of the column.
   * @param column: an array of strings representing the column values.
   *
   * @returns the TypeProperty object or null if nothing can be determined with
   * high confidence.
   */
  detectHighConfidence(header: string, column: Array<string>): TypeProperty {
    // For now, only supports detecting country and states (US, India) with high
    // confidence.
    // In the future, this should be modified to run through a list of detailed
    // high confidence place detectors.
    const country = this.detectCountryHighConf(column);

    // If country was detected and the header has a country in the name, return
    // country. If not, we have to do more work to disambiguate country vs state.
    if (
      country != null &&
      toAlphaNumericAndLower(header).split("country").length > 1
    ) {
      return country;
    }

    const state = this.detectStateHighConf(column);
    // If state was detected and the header has a state in the name, return
    // state.
    if (
      state != null &&
      toAlphaNumericAndLower(header).split("state").length > 1
    ) {
      return state;
    }

    // If neither of the two conditions above were met, return in a priority
    // order with country before state.
    return country != null ? country : state;
  }

  /**
   * Detecting Place.
   * If nothing is detected, null is returned.
   * Otherwise, the detectedTypeProperty is returned.
   * It is up to the consumer, e.g. in heuristics.ts, to decide whether to
   * pass the low confidence detection back to the user (or not).
   *
   * @param header: the column header string.
   * @param column: an array of string column values.
   *
   * @returns the DetectedDetails object (or null).
   */
  detect(header: string, column: Array<string>): DetectedDetails {
    const hcDetected = this.detectHighConfidence(header, column);

    if (hcDetected != null) {
      // High Confidence detection is given higher priority.
      return {
        detectedTypeProperty: hcDetected,
        confidence: ConfidenceLevel.High,
      };
    }
    // Now try low confidence detection.
    const lcDetected = this.detectLowConfidence(header);
    if (lcDetected != null) {
      return {
        detectedTypeProperty: lcDetected,
        confidence: ConfidenceLevel.Low,
      };
    }
    return null;
  }
}
