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

export { DataGroup, DataPoint};
