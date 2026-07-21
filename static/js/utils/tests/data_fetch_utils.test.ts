/**
 * Copyright 2023 Google LLC
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

/* eslint-disable camelcase */
import axios from "axios";
import { when } from "jest-when";

import { TEST_SURFACE, TEST_SURFACE_HEADER } from "../../shared/constants";
import { stringifyFn } from "../axios";
import {
  findMatchingFacets,
  getBestUnit,
  getPoint,
  getPointWithin,
} from "../data_fetch_utils";

const TEST_UNIT = "unit";
const CHILD_TYPE = "childType";
const DATE = "";
const PARENT_ENTITY = "parent";
const VARIABLES = ["stat_var_1", "stat_var_2", "stat_var_3"];
const ENTITIES = ["place_1", "place_2", "place_3", "place_4"];

const TEST_POINT_API_RESPONSE = {
  data: {
    stat_var_1: {
      place_1: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
      place_2: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
      place_3: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
      place_4: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
    },
    stat_var_2: {
      place_1: {
        date: "",
        value: 1,
        facet: "facet_1",
      },
      place_2: {
        date: "",
        value: 1,
        facet: "facet_2",
      },
      place_3: {
        date: "",
        value: 1,
        facet: "facet_1",
      },
      place_4: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
    },
    stat_var_3: {
      place_1: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
      place_2: {
        date: "",
        value: 1,
        facet: "facet_2",
      },
      place_3: {
        date: "",
        value: 1,
        facet: "facet_1",
      },
      place_4: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
    },
  },
  facets: {
    facet_1: {
      unit: TEST_UNIT,
    },
    facet_2: {
      unit: "test",
      unitDisplayName: TEST_UNIT,
    },
    facet_3: {},
  },
};
const TEST_PROCESSED_RESPONSE_1_2_ALIGNED = {
  data: {
    stat_var_1: {
      place_1: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
      place_2: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
      place_3: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
      place_4: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
    },
    stat_var_2: {
      place_4: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
    },
    stat_var_3: {
      place_1: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
      place_4: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
    },
  },
  facets: {
    facet_1: {
      unit: TEST_UNIT,
    },
    facet_2: {
      unit: "test",
      unitDisplayName: TEST_UNIT,
    },
    facet_3: {},
  },
};
const TEST_PROCESSED_RESPONSE_NO_ALIGN = {
  data: {
    stat_var_1: {
      place_1: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
      place_2: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
      place_3: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
      place_4: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
    },
    stat_var_2: {
      place_1: {
        date: "",
        value: 1,
        facet: "facet_1",
      },
      place_2: {
        date: "",
        value: 1,
        facet: "facet_2",
      },
      place_3: {
        date: "",
        value: 1,
        facet: "facet_1",
      },
    },
    stat_var_3: {
      place_1: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
      place_4: {
        date: "",
        value: 1,
        facet: "facet_3",
      },
    },
  },
  facets: {
    facet_1: {
      unit: TEST_UNIT,
    },
    facet_2: {
      unit: "test",
      unitDisplayName: TEST_UNIT,
    },
    facet_3: {},
  },
};

function axiosMock(): void {
  axios.get = jest.fn();
  when(axios.get)
    .calledWith("/api/observations/point/within", {
      params: {
        childType: CHILD_TYPE,
        date: DATE,
        parentEntity: PARENT_ENTITY,
        variables: VARIABLES,
      },
      paramsSerializer: stringifyFn,
      headers: TEST_SURFACE_HEADER,
    })
    .mockResolvedValue({
      data: TEST_POINT_API_RESPONSE,
    });
  when(axios.get)
    .calledWith("/api/observations/point", {
      params: {
        date: DATE,
        variables: VARIABLES,
        entities: ENTITIES,
      },
      paramsSerializer: stringifyFn,
      headers: TEST_SURFACE_HEADER,
    })
    .mockResolvedValue({
      data: TEST_POINT_API_RESPONSE,
    });
}

test("getBestUnit", () => {
  const cases: {
    unit2Count: Record<string, number>;
    expected: string;
  }[] = [
    {
      unit2Count: { a: 2, b: 4, c: 3 },
      expected: "b",
    },
    {
      unit2Count: { b: 3, a: 3, c: 3 },
      expected: "a",
    },
  ];

  for (const c of cases) {
    const bestUnit = getBestUnit(c.unit2Count);
    try {
      expect(bestUnit).toEqual(c.expected);
    } catch (e) {
      console.log(`Failed for case with units: ${c.unit2Count}`);
      throw e;
    }
  }
});

test("getPoint no align", () => {
  axiosMock();
  return getPoint(
    "",
    ENTITIES,
    VARIABLES,
    DATE,
    undefined, // alignedVariables
    undefined, // highlightFacet
    undefined, // facetIds
    TEST_SURFACE
  ).then((resp) => {
    expect(resp).toEqual(TEST_PROCESSED_RESPONSE_NO_ALIGN);
  });
});

test("getPoint align", () => {
  axiosMock();
  return getPoint(
    "",
    ENTITIES,
    VARIABLES,
    DATE,
    [["stat_var_1", "stat_var_2"]],
    undefined, // highlightFacet
    undefined, // facetIds
    TEST_SURFACE
  ).then((resp) => {
    expect(resp).toEqual(TEST_PROCESSED_RESPONSE_1_2_ALIGNED);
  });
});

test("getPointWithin no align", () => {
  axiosMock();
  return getPointWithin(
    "",
    CHILD_TYPE,
    PARENT_ENTITY,
    VARIABLES,
    DATE,
    undefined, // alignedVariables
    undefined, // facetIds
    TEST_SURFACE
  ).then((resp) => {
    expect(resp).toEqual(TEST_PROCESSED_RESPONSE_NO_ALIGN);
  });
});

test("getPointWithin", () => {
  axiosMock();
  return getPointWithin(
    "",
    CHILD_TYPE,
    PARENT_ENTITY,
    VARIABLES,
    DATE,
    [["stat_var_1", "stat_var_2"]],
    undefined, // facetIds
    TEST_SURFACE
  ).then((resp) => {
    expect(resp).toEqual(TEST_PROCESSED_RESPONSE_1_2_ALIGNED);
  });
});

test("findMatchingFacets", () => {
  // Test: Direct importName match.
  // Situation: Highlight criteria has importName 'StormNOAA_Agg', facet has importName 'StormNOAA_Agg'.
  // Expectation: Matches and returns the facet ID.
  const facetsDirect = {
    facet_1: {
      importName: "StormNOAA_Agg",
      provenanceId: "dc/base/StormNOAA_Agg",
    },
  };
  expect(
    findMatchingFacets(facetsDirect, {
      facetMetadata: { importName: "StormNOAA_Agg" },
    })
  ).toEqual(["facet_1"]);

  // Test: Fallback to provenanceId match.
  // Situation: Highlight criteria has importName 'StormNOAA_Agg', facet has provenanceId 'dc/base/StormNOAA_Agg' but no importName.
  // Expectation: Matches and returns the facet ID.
  const facetsFallback = {
    facet_2: {
      provenanceId: "dc/base/StormNOAA_Agg",
    },
  };
  expect(
    findMatchingFacets(facetsFallback, {
      facetMetadata: { importName: "StormNOAA_Agg" },
    })
  ).toEqual(["facet_2"]);

  // Test: No match on wrong importName.
  // Situation: Highlight criteria has importName 'StormNOAA_Agg', facet has importName 'Different_Import'.
  // Expectation: Does not match (returns empty array).
  const facetsMismatchImport = {
    facet_3: {
      importName: "Different_Import",
      provenanceId: "dc/base/StormNOAA_Agg",
    },
  };
  expect(
    findMatchingFacets(facetsMismatchImport, {
      facetMetadata: { importName: "StormNOAA_Agg" },
    })
  ).toEqual([]);

  // Test: No match on wrong provenanceId prefix.
  // Situation: Highlight criteria has importName 'StormNOAA_Agg', facet has provenanceId 'other/prefix/StormNOAA_Agg' and no importName.
  // Expectation: Does not match (returns empty array).
  const facetsMismatchProvenance = {
    facet_4: {
      provenanceId: "other/prefix/StormNOAA_Agg",
    },
  };
  expect(
    findMatchingFacets(facetsMismatchProvenance, {
      facetMetadata: { importName: "StormNOAA_Agg" },
    })
  ).toEqual([]);
});

