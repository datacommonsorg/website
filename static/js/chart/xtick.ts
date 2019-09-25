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

import moment from "moment";

import { BarLayout, Layout, Range, computeCoordinate } from "./base";

const X_TICK_ATTR = { fill: "#5F6368", size: "9px" };
const X_TICK_TOP_MARGIN = 5;

class XTick {
  valueRange: Range;
  data: [number, string][];
  unit?: string;
  constructor(valueRange: Range, data: [number, string][]) {
    this.valueRange = valueRange;
    this.data = data;
  }
}

/**
 * Function to get line chart x ticks.
 *
 * @param dates The original date list in sorted order.
 */
function getLineXTick(dates: string[]): XTick {
  let start = moment.utc(dates[0]);
  let end = moment.utc(dates[dates.length - 1]);
  // Total duration in days.
  let duration = end.diff(start, "days");
  let format: string;
  let step: number;
  let tickStart = start.clone();
  let tickEnd = end.clone();
  if (duration < 30) {
    format = "MM-DD";
    // Step in days.
    step = Math.ceil(Math.max(2, duration / 4));
    tickStart.startOf("day");
  } else if (duration < 120) {
    format = "MMM";
    // Step in months.
    step = 1;
    tickStart.startOf("month");
  } else if (duration < 180) {
    format = "MMM";
    // Step in bi-monthly.
    step = 2;
    tickStart.startOf("month");
  } else if (duration < 360) {
    format = "MMM";
    // Step in quarterly.
    step = 3;
    tickStart.startOf("month");
  } else if (duration < 720) {
    // Step in half yearl.
    format = "MMM";
    step = 6;
    tickStart.startOf("month");
  } else if (duration < 365 * 5) {
    tickStart.startOf("year");
    format = "YYYY";
    step = 1;
  } else if (duration < 365 * 10) {
    tickStart.startOf("year");
    format = "YYYY";
    step = 2;
  } else {
    tickStart.startOf("year");
    format = "YYYY";
    let durationYear = end.diff(start, "years");
    step = Math.floor(durationYear / 40);
    if (step == 0) {
      step = 5;
    } else {
      step *= 10;
    }
    let startYear = Math.floor(tickStart.year() / step) * step;
    tickStart.year(startYear);
  }

  let data: [number, string][] = [];
  let tick = tickStart.clone();
  while (tick < tickEnd) {
    data.push([tick.unix(), tick.format(format)]);
    // Can not use a variable for the unit. Hence need to repeat the if else
    // logic in here.
    if (duration < 30) {
      tick.add(step, "days");
    } else if (duration < 540) {
      tick.add(step, "months");
    } else {
      tick.add(step, "years");
    }
  }
  data.push([tick.unix(), tick.format(format)]);
  return new XTick(new Range(tickStart.unix(), tick.unix()), data);
}

/**
 * Draw the Line chart X ticks.
 */
function drawLineXTicks(canvas: any, layout: Layout, xTick: XTick): number {
  let group = canvas.group();
  for (let i = 0; i < xTick.data.length; i++) {
    let x = computeCoordinate(
      xTick.data[i][0],
      xTick.valueRange,
      layout.xRange
    );
    let text = canvas.text(xTick.data[i][1]).font(X_TICK_ATTR).center(x, 0);
    group.add(text);
  }
  let height = group.bbox().height + X_TICK_TOP_MARGIN;
  group.move("y", layout.yRange.high - height + X_TICK_TOP_MARGIN);
  return height;
}

/**
 * Draw the X ticks (containing text).
 */
function drawBarXTicks(
  canvas: any,
  layout: BarLayout,
  textList: string[]
): number {
  let group = canvas.group();
  for (let i = 0; i < textList.length; i++) {
    let startX =
      layout.xRange.low +
      layout.barGap +
      layout.barWidth * 0.5 +
      i * (layout.barGap + layout.barWidth);
    const tokens = textList[i].split(" ");
    let startY = 0;
    let index = 0;
    while (index < tokens.length) {
      let text = canvas.text(tokens[index]);
      index += 1;
      while (index < tokens.length) {
        let currentText = text.text();
        text.text(currentText + " " + tokens[index]);
        if (text.length() > layout.barWidth) {
          text.text(currentText);
          break;
        }
        index += 1;
      }
      text.font(X_TICK_ATTR).addClass("xtick-text").center(startX, startY);
      group.add(text);
      startY += text.bbox().height;
    }
  }
  let height = group.bbox().height + X_TICK_TOP_MARGIN;
  group.move("y", layout.yRange.high - height + X_TICK_TOP_MARGIN);
  return height;
}

export { drawBarXTicks, getLineXTick, drawLineXTicks };
