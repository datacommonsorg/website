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

/**
 * Range represents a range with low and high value.
 */
class Range {
  low: number;
  high: number;
  constructor(low: number, high: number) {
    this.low = low;
    this.high = high;
  }
  span(): number {
    return this.high - this.low;
  }
}

class DataPoint {
  value: number;
  label: string;
  constructor(label: string, value: number) {
    this.value = value;
    this.label = label;
  }
}

class DataGroup {
  value: DataPoint[];
  // Label of the DataGroup. This could be different from the DataPoint label.
  // For example, the label of a data point could be date string, while the
  // label of the DataGroup is a place name.
  label: string;
  constructor(label: string, value: DataPoint[]) {
    this.value = value;
    this.label = label;
  }
  sum(): number {
    return this.value
      .map((dataPoint) => dataPoint.value)
      .reduce((a, b) => a + b);
  }
  max(): number {
    return Math.max(...this.value.map((dataPoint) => dataPoint.value));
  }
  min(): number {
    return Math.min(...this.value.map((dataPoint) => dataPoint.value));
  }
}

class Layout {
  xRange: Range;
  yRange: Range;
  constructor(xr: Range, yr: Range) {
    this.xRange = xr;
    this.yRange = yr;
  }
}

class BarLayout extends Layout {
  barGap: number;
  barWidth: number;
  constructor(xr: Range, yr: Range, barGap: number, barWidth: number) {
    super(xr, yr);
    this.barGap = barGap;
    this.barWidth = barWidth;
  }
}

/**
 * Computes the coordinate of a value, given the value range and the
 * coordinate range.
 *
 * @param v The value.
 * @param vRange The value range.
 * @param cRange The coordinate range.
 *
 * @return The coordinate.
 */
function computeCoordinate(v: number, vRange: Range, cRange: Range): number {
  let unitSize = cRange.span() / vRange.span();
  return cRange.low + unitSize * (v - vRange.low);
}

export { DataGroup, DataPoint, Layout, BarLayout, Range, computeCoordinate };
