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

import * as _SVG from "@svgdotjs/svg.js";
import {Layout, Range, computeCoordinate} from "./base"

const NUMBER_SUFFIXES: [number, string][] = [
  [15, "Q"],
  [12, "T"],
  [9, "B"],
  [6, "M"],
  [3, "K"],
  [0, ""],
  [-3, ""],
  [-6, "e-6"],
  [-9, "e-9"],
];

const Y_TICK_ATTR = { fill: "#5F6368", size: "9px", anchor: "end" };
const Y_TICK_MARGIN = 10;
const Y_TICK_LABEL_ADJUST = 5;  // adjust the labels to the middle of each tick

class YTick {
  valueRange: Range;
  data: [number, string][];
  unit?: string;
  constructor(valueRange: Range, data: [number, string][]) {
    this.valueRange = valueRange;
    this.data = data;
  }
}

/**
 * Get the Y tick value and text.
 */
function getYTick(dataRange: Range): YTick {
  let data: [number, string][] = [];
  let maxY = dataRange.high;
  let minY = dataRange.low;
  let ydiff = maxY - minY;

  let expn = -10;
  let name = "";
  for (let suffix of NUMBER_SUFFIXES) {
    if (ydiff > Math.pow(10, suffix[0])) {
      if (suffix[0] > expn) {
        expn = suffix[0];
        name = suffix[1];
      }
    }
  }
  let unit = Math.pow(10, expn);

  // All values below are scaled by unit.
  ydiff = ydiff / unit;
  maxY = maxY / unit;
  minY = minY / unit;
  let exp = Math.log10(ydiff);
  let scale = Math.floor(exp);
  let e1 = Math.log(Math.pow(10, exp - scale));
  let e2 = Math.log(2.236);
  let index = Math.floor(e1 / e2);
  let step = 0.5 * Math.pow(2, index);

  let baseStep = Math.floor(minY / (step * Math.pow(10, scale)));
  let lowTick = baseStep * Math.pow(10, scale) * step;
  // Value range aligns with the coordinate range.
  let valueRange = new Range(maxY * unit, lowTick * unit);

  for (let i = 0; i < 6; i++) {
    let yVal = lowTick + i * step * Math.pow(10, scale);
    // Y tick line should below the maximum value.
    if (yVal > maxY) {
      break;
    }
    let yText;
    if (Math.abs(yVal) < 1e-9) {
      yText = "0";
    } else if (expn == -3) {
      yText = `${(yVal * unit).toFixed(2)}${name}`;
    } else if (scale == 0 && index == 0) {
      yText = `${yVal.toFixed(1)}${name}`;
    } else {
      yText = `${yVal.toFixed(0)}${name}`;
    }
    data.push([yVal * unit, yText]);
  }
  return new YTick(valueRange, data);
}

function computeYTickWidth(yTick: YTick): number {
  const canvas = _SVG.SVG().size(100, 200);
  let result = 0;
  for (let data of yTick.data) {
    let text = data[1];
    if (yTick.unit) {
      text += " " + yTick.unit;
    }
    let textElem = canvas.text(text).font(Y_TICK_ATTR);
    result = Math.max(result, textElem.bbox().width);
  }
  return result;
}

/**
 * Function to draw Y ticks.
 *
 * @param canvas
 * @param layout
 * @param yTick
 *
 * @return The value range of the chart.
 */
function drawYTicks(canvas: any, layout: Layout, yTick: YTick) {
  for (let data of yTick.data) {
    // Draw the Y tick lines.
    let yPos = computeCoordinate(data[0], yTick.valueRange, layout.yRange);
    let line = canvas
      .line(layout.xRange.low, yPos, layout.xRange.high, yPos)
      .stroke({ width: 1, color: "#DADCE0" });
    line.addClass("ytick");

    // Draw the Y tick text.
    let text = data[1];
    if (yTick.unit) {
      if (yTick.unit == "$") {
        text = "$" + data[1];
      } else if (yTick.unit == "%") {
        text = data[1] + "%";
      }
    }
    canvas
      .text(text)
      .x(layout.xRange.low - Y_TICK_MARGIN)
      .cy(yPos + Y_TICK_LABEL_ADJUST)
      .attr({ "text-anchor": "end" })
      .font(Y_TICK_ATTR);
  }
}

export {
  YTick,
  Y_TICK_MARGIN,
  computeYTickWidth,
  drawYTicks,
  getYTick
};
