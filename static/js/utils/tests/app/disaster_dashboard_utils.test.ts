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

import {
  EARTH_NAMED_TYPED_PLACE,
  USA_NAMED_TYPED_PLACE,
} from "../../../shared/constants";
import { NamedTypedPlace } from "../../../shared/types";
import { getFilteredParentPlaces } from "../../app/disaster_dashboard_utils";

const CALIFORNIA_PLACE = {
  dcid: "geoId/06",
  name: "California",
  types: ["State"],
};

const RAW_CALIFORNIA_PARENTS = [
  USA_NAMED_TYPED_PLACE,
  {
    dcid: "northamerica",
    name: "North America",
    types: ["Continent"],
  },
];
test("getFilteredParentPlaces", () => {
  const cases: {
    name: string;
    place: NamedTypedPlace;
    parentPlaces: NamedTypedPlace[];
    expected: NamedTypedPlace[];
  }[] = [
    {
      name: "keep all",
      place: CALIFORNIA_PLACE,
      parentPlaces: RAW_CALIFORNIA_PARENTS,
      expected: [...RAW_CALIFORNIA_PARENTS, EARTH_NAMED_TYPED_PLACE],
    },
    {
      name: "filter out bad place",
      place: CALIFORNIA_PLACE,
      parentPlaces: [
        ...RAW_CALIFORNIA_PARENTS,
        { dcid: "testPlace", name: "Test Place", types: ["Place"] },
      ],
      expected: [...RAW_CALIFORNIA_PARENTS, EARTH_NAMED_TYPED_PLACE],
    },
    {
      name: "empty parent places",
      place: CALIFORNIA_PLACE,
      parentPlaces: [],
      expected: [EARTH_NAMED_TYPED_PLACE],
    },
    {
      name: "earth as place",
      place: EARTH_NAMED_TYPED_PLACE,
      parentPlaces: [],
      expected: [],
    },
  ];

  for (const c of cases) {
    const filteredParentPlaces = getFilteredParentPlaces(
      c.parentPlaces,
      c.place
    );
    try {
      expect(filteredParentPlaces).toEqual(c.expected);
    } catch (e) {
      console.log(`Failed for case with title: ${c.name}`);
      throw e;
    }
  }
});
