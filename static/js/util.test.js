import { updateUrlStatsVar, parseStatVarPath } from "./util.js";

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
  window.location.hash = "#&statsvar=dc/test,Demo,prop";
  expect(parseStatVarPath()).toStrictEqual([["Demo", "prop"]]);
});
