import { getPlaceNames, updateUrl, parseUrl } from "./timeline_util";

test("update Url statsvar", () => {
  window.location.hash = "";
  // add statsvar with path
  updateUrl({ statsVar: { statsVar: "dc/test1,0,0", shouldAdd: true } });
  expect(window.location.hash).toBe("#&statsVar=dc/test1,0,0");
  // add statsvar with name
  updateUrl({ statsVar: { statsVar: "dc/test2", shouldAdd: true } });
  expect(window.location.hash).toBe("#&statsVar=dc/test1,0,0__dc/test2");
  // add existing statsvar with name
  updateUrl({ statsVar: { statsVar: "dc/test1", shouldAdd: true } });
  expect(window.location.hash).toBe("#&statsVar=dc/test1,0,0__dc/test2");
  // delete statsvar with name
  updateUrl({ statsVar: { statsVar: "dc/test1", shouldAdd: false } });
  expect(window.location.hash).toBe("#&statsVar=dc/test2");
  // delete statsvar with path
  updateUrl({ statsVar: { statsVar: "dc/test2", shouldAdd: false } });
  expect(window.location.hash).toBe("");
  // delete statsvar not in list
  updateUrl({ statsVar: { statsVar: "dc/test2", shouldAdd: false } });
  expect(window.location.hash).toBe("");
  window.location.hash = "#&place=geoId/01";
  updateUrl({ statsVar: { statsVar: "dc/test1", shouldAdd: true } });
  expect(window.location.hash).toBe("#&place=geoId/01&statsVar=dc/test1");
});

test("parse statsVar from Url", () => {
  window.location.hash = "#&statsVar=Count_Person";
  expect(parseUrl().statsVarId).toStrictEqual(["Count_Person"]);
  expect(parseUrl().statsVarPath).toStrictEqual([[0, 0]]);
});

test("update places from Url", () => {
  window.location.hash = "#&place=geo/01";
  updateUrl({ place: { place: "geo/02", shouldAdd: true } });
  expect(window.location.hash).toBe(
    "#&place=geo/01,geo/02&statsVar=Count_Person"
  );
  updateUrl({ place: { place: "geo/02", shouldAdd: false } });
  expect(window.location.hash).toBe("#&place=geo/01&statsVar=Count_Person");
  updateUrl({ place: { place: "geo/01", shouldAdd: false } });
  expect(window.location.hash).toBe("#&statsVar=Count_Person");
});

test("parse places from Url", () => {
  window.location.hash = "#&place=geoId/4459000,country/USA";
  expect(parseUrl().placeId).toStrictEqual(["geoId/4459000", "country/USA"]);
});

test("get place names", () => {
  const dcids = ["geoId/4459000", "country/USA"];
  const placesPromise = getPlaceNames(dcids);
  placesPromise.then((places) => {
    expect(places).toStrictEqual({
      "geoId/4459000": "Providence",
      "country/USA": "United States",
    });
  });
});
