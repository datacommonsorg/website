import {
  updateUrlStatsVar,
  parseStatVarPath,
  updateUrlPlace,
  parsePlace,
  getPlaceNames,
} from "./timeline_util.js";
import { SEP } from "./statsvar_menu";

test("update Url statsvar", () => {
  window.location.hash = "";
  updateUrlStatsVar("dc/test1", true);
  expect(window.location.hash).toBe("#&statsvar=dc/test1");
  updateUrlStatsVar("dc/test2", true);
  expect(window.location.hash).toBe("#&statsvar=dc/test1__dc/test2");
  updateUrlStatsVar("dc/test2", false);
  expect(window.location.hash).toBe("#&statsvar=dc/test1");
  updateUrlStatsVar("dc/test2", false);
  expect(window.location.hash).toBe("#&statsvar=dc/test1");
  window.location.hash = "#&place=geoId/01";
  updateUrlStatsVar("dc/test1", true);
  expect(window.location.hash).toBe("#&place=geoId/01&statsvar=dc/test1");
});

test("parse statvar from Url", () => {
  window.location.hash = "#&statsvar=dc/test"+SEP+"Demo"+SEP+"prop";
  expect(parseStatVarPath()).toStrictEqual([[["Demo", "prop"]], ["dc/test"]]);
});

test("update places from Url", () => {
  window.location.hash = "#&place=geo/01";
  updateUrlPlace("geo/02", true);
  expect(window.location.hash).toBe(
    "#&place=geo/01,geo/02&statsvar=Count_Person'Population"
  );
  updateUrlPlace("geo/02", false);
  expect(window.location.hash).toBe(
    "#&place=geo/01&statsvar=Count_Person" + SEP + "Population"
  );
  updateUrlPlace("geo/01", false);
  expect(window.location.hash).toBe(
    "#&statsvar=Count_Person" + SEP + "Population"
  );
});

test("parse places from Url", () => {
  window.location.hash = "#&place=geoId/4459000,country/USA";
  expect(parsePlace()).toStrictEqual(["geoId/4459000", "country/USA"]);
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
