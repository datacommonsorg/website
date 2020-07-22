import {
  getPlaceNames,
  updateUrl,
  parseUrl,
} from "./timeline_util";
import { SEP } from "./statsvar_menu";

test("update Url statsvar", () => {
  window.location.hash = "";
  updateUrl({ svPath: { statsvar: "dc/test1", shouldAdd: true } });
  expect(window.location.hash).toBe("#&statsvar=dc/test1");
  updateUrl({ svPath: { statsvar: "dc/test2", shouldAdd: true } });
  expect(window.location.hash).toBe("#&statsvar=dc/test1__dc/test2");
  updateUrl({ svPath: { statsvar: "dc/test2", shouldAdd: false } });
  expect(window.location.hash).toBe("#&statsvar=dc/test1");
  updateUrl({ svPath: { statsvar: "dc/test2", shouldAdd: false } });;
  expect(window.location.hash).toBe("#&statsvar=dc/test1");
  window.location.hash = "#&place=geoId/01";
  updateUrl({ svPath: { statsvar: "dc/test1", shouldAdd: true } });
  expect(window.location.hash).toBe("#&place=geoId/01&statsvar=dc/test1");
});

test("parse statvar from Url", () => {
  window.location.hash = "#&statsvar=dc/test" + SEP + "Demo" + SEP + "prop";
  expect(parseUrl().svPath).toStrictEqual([["Demo", "prop"]]);
  expect(parseUrl().svId).toStrictEqual(["dc/test"]);
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
  updateUrl({ svDelete: "dc/test2" })
  expect(window.location.hash).toBe(
    "#&statsvar=dc/test" + SEP + "Demographics" + SEP + "Population"
  );
  updateUrl({ svDelete: "dc/test" })
  expect(window.location.hash).toBe("");
});
