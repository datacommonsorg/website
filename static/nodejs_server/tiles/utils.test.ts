/**
 * Copyright 2024 Google LLC
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
import { TEXT_FONT_FAMILY } from "../../js/chart/draw_constants";
import { FONT_FAMILY } from "../constants";
import { getProcessedSvg } from "./utils";

test("getProcessedSvg strips inline font-family and sets server font", () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "200");
  svg.setAttribute("height", "100");
  svg.style.fontFamily = TEXT_FONT_FAMILY;
  svg.style.fontSize = "10px";
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.style.fontFamily = TEXT_FONT_FAMILY;
  text.style.fill = "#2b2929";
  text.textContent = "Label";
  svg.appendChild(text);

  const processed = getProcessedSvg(svg);
  expect(processed.style.fontFamily).toBe("");
  expect(processed.style.fontSize).toBe("10px");
  const processedText = processed.querySelector("text");
  expect(processedText.style.fontFamily).toBe("");
  expect(processedText.getAttribute("font-family")).toBe(FONT_FAMILY);
});
