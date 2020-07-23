import {
  getPlaceNames,
  updateUrl,
  parseUrl,
} from "./timeline_util";
import { SEP } from "./statsvar_menu";

test("update Url statsvar", () => {
  window.location.hash = "";
  updateUrl({ statsVarPath: { statsVar: "dc/test1", shouldAdd: true } });
  expect(window.location.hash).toBe("#&statsvar=dc/test1");
  updateUrl({ statsVarPath: { statsVar: "dc/test2", shouldAdd: true } });
  expect(window.location.hash).toBe("#&statsvar=dc/test1__dc/test2");
  updateUrl({ statsVarPath: { statsVar: "dc/test2", shouldAdd: false } });
  expect(window.location.hash).toBe("#&statsvar=dc/test1");
  updateUrl({ statsVarPath: { statsVar: "dc/test2", shouldAdd: false } });;
  expect(window.location.hash).toBe("#&statsvar=dc/test1");
  window.location.hash = "#&place=geoId/01";
  updateUrl({ statsVarPath: { statsVar: "dc/test1", shouldAdd: true } });
  expect(window.location.hash).toBe("#&place=geoId/01&statsvar=dc/test1");
});

test("parse statsVar from Url", () => {
  window.location.hash = "#&statsvar=dc/test" + SEP + "Demo" + SEP + "prop";
  expect(parseUrl().statsVarPath).toStrictEqual([["Demo", "prop"]]);
  expect(parseUrl().statsVarId).toStrictEqual(["dc/test"]);
});

test("update places from Url", () => {
  window.location.hash = "#&place=geo/01";
  updateUrl({ place: { place: "geo/02", shouldAdd: true } })
  expect(window.location.hash).toBe(
    "#&place=geo/01,geo/02&statsvar=Count_Person" + SEP + "Demographics" + SEP + "Population"
  );
  updateUrl({ place: { place: "geo/02", shouldAdd: false } })
  expect(window.location.hash).toBe(
    "#&place=geo/01&statsvar=Count_Person" + SEP + "Demographics" + SEP + "Population"
  );
  updateUrl({ place: { place: "geo/01", shouldAdd: false } })
  expect(window.location.hash).toBe(
    "#&statsvar=Count_Person" + SEP + "Demographics" + SEP + "Population"
  );
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

test("delete stat var", () => {
  window.location.hash = [
    "#&statsvar=dc/test",
    "Demographics",
    "Population" + "__dc/test2",
    "Crime",
    "CrimeType",
  ].join(SEP);
  updateUrl({ statsVarDelete: "dc/test2" })
  expect(window.location.hash).toBe(
    "#&statsvar=dc/test" + SEP + "Demographics" + SEP + "Population"
  );
  updateUrl({ statsVarDelete: "dc/test" })
  expect(window.location.hash).toBe("");
});
