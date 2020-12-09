import { ContextType } from "./context";
/**
 * Copyright 2020 Google LLC
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

import { updateHash, applyHash } from "./util";

const TestContext = ({
  x: {
    value: {
      statVar: {
        Count_Person: {
          paths: [["0", "1"]],
          denominators: ["Count_Person_Female", "Count_Person_Male"],
        },
      },
      name: "People",
      log: true,
      perCapita: false,
    },
  },
  y: {
    value: {
      statVar: {
        Count_HousingUnit: {
          paths: [["5", "6"]],
          denominators: [],
        },
      },
      name: "Housing Units",
      log: false,
      perCapita: true,
    },
  },
  place: {
    value: {
      enclosingPlace: {
        name: "Delaware",
        dcid: "geoId/10",
      },
      enclosedPlaceType: "County",
      enclosedPlaces: [
        {
          name: "a county",
          dcid: "geoId/10003",
        },
        {
          name: "another county",
          dcid: "geoId/10005",
        },
      ],
      lowerBound: 0,
      upperBound: 99999,
    },
  },
  date: {
    value: {
      year: 2016,
      month: 0,
      day: 0,
    },
  },
} as unknown) as ContextType;
const Hash =
  "#%26svx%3DCount_Person%26svpx%3D0-1%26svdx%3DCount_Person_Female%26svnx%3DPeople%26lx%3D1%26svy%3DCount_HousingUnit%26svpy%3D5-6%26svny%3DHousing%20Units%26pcy%3D1%26epd%3DgeoId%2F10%26epn%3DDelaware%26ept%3DCounty%26ub%3D99999%26y%3D2016";

test("updateHash", () => {
  history.pushState = jest.fn();
  updateHash(TestContext);
  expect(history.pushState).toHaveBeenCalledWith(
    {},
    "",
    `/tools/scatter2${Hash}`
  );
});

test("applyHash", () => {
  const context = { x: {}, y: {}, place: {}, date: {} } as ContextType;
  context.x.set = (value) => (context.x.value = value);
  context.y.set = (value) => (context.y.value = value);
  context.place.set = (value) => (context.place.value = value);
  context.date.set = (value) => (context.date.value = value);
  location.hash = Hash;
  applyHash(context);
  expect(context.x.value).toEqual({
    ...TestContext.x.value,
    statVar: {
      Count_Person: {
        paths: [["0", "1"]],
        denominators: ["Count_Person_Female"],
      },
    },
  });
  expect(context.y.value).toEqual(TestContext.y.value);
  expect(context.place.value).toEqual({
    ...TestContext.place.value,
    enclosedPlaces: [],
  });
  expect(context.date.value).toEqual(TestContext.date.value);
});
