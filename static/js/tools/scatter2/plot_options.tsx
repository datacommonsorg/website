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
 * Plot options for log scale, per capita, swapping axes, and
 * lower and upper bounds for populations.
 */

import React, { useContext, useState } from "react";
import { FormGroup, Label, Input, Card, Button, Collapse } from "reactstrap";
import {
  AxisWrapper,
  Context,
  DateInfoWrapper,
  PlaceInfoWrapper,
} from "./context";

import { Container, Row, Col } from "reactstrap";

function PlotOptions(): JSX.Element {
  const { place, date, x, y } = useContext(Context);

  const [open, setOpen] = useState(false);

  const { year, month, day } = date.value;

  return (
    <Card>
      <Container id="plot-options">
        <Row>
          <Col xs="auto">Date</Col>
          <Col xs="auto">
            <FormGroup className="flex-container">
              <Input
                type="select"
                onChange={(event) => selectYear(date, event)}
                className="datepicker"
                value={year}
              >
                <option value={0}>Year</option>
                {getYears().map((year) => (
                  <option value={year} key={year}>
                    {year}
                  </option>
                ))}
              </Input>
              <Input
                type="select"
                onChange={(event) => selectMonth(date, event)}
                className="datepicker"
                value={month}
              >
                <option value={0}>Month</option>
                {getMonths().map((month) => (
                  <option value={month} key={month}>
                    {month}
                  </option>
                ))}
              </Input>
              <Input
                type="select"
                onChange={(event) => selectDay(date, event)}
                className="datepicker"
                value={day}
              >
                <option value={0}>Day</option>
                {getDays().map((day) => (
                  <option value={day} key={day}>
                    {day}
                  </option>
                ))}
              </Input>
            </FormGroup>
          </Col>
          <Col xs="auto">
            <Button
              className="flex-container"
              color="light"
              size="sm"
              onClick={() => setOpen(!open)}
            >
              <i className="material-icons">
                {open ? "expand_less" : "expand_more"}
              </i>
              More Options
            </Button>
          </Col>
        </Row>
        <Row>
          <Collapse isOpen={open} className="flex-container">
            <Container>
              <Row>
                <Col xs="3">Only plot places of this size</Col>
                <Col>
                  <FormGroup check>
                    <Input
                      type="number"
                      onChange={(e) => selectLowerBound(place, e)}
                      value={place.value.lowerBound}
                    />
                  </FormGroup>
                </Col>
                <Col xs="auto">to</Col>
                <Col>
                  <FormGroup check>
                    <Input
                      type="number"
                      onChange={(e) => selectUpperBound(place, e)}
                      value={
                        place.value.upperBound === Number.POSITIVE_INFINITY
                          ? 1e10
                          : place.value.upperBound
                      }
                    />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col xs="3">Plot Options</Col>
                <Col>
                  <Button
                    id="swap-axes"
                    size="sm"
                    color="light"
                    onClick={() => swapAxes(x, y)}
                  >
                    Swap X and Y axes
                  </Button>
                </Col>
                <Col>
                  <FormGroup check>
                    <Label check>
                      <Input
                        id="per-capita-x"
                        type="checkbox"
                        checked={x.value.perCapita}
                        onChange={(e) => checkPerCapita(x, e)}
                      />
                      Plot X-axis per capita
                    </Label>
                  </FormGroup>
                  <FormGroup check>
                    <Label check>
                      <Input
                        id="per-capita-y"
                        type="checkbox"
                        checked={y.value.perCapita}
                        onChange={(e) => checkPerCapita(y, e)}
                      />
                      Plot Y-axis per capita
                    </Label>
                  </FormGroup>
                </Col>
                <Col>
                  <FormGroup check>
                    <Label check>
                      <Input
                        id="log-x"
                        type="checkbox"
                        checked={x.value.log}
                        onChange={(e) => checkLog(x, e)}
                      />
                      Plot X-axis on log scale
                    </Label>
                  </FormGroup>
                  <FormGroup check>
                    <Label check>
                      <Input
                        id="log-y"
                        type="checkbox"
                        checked={y.value.log}
                        onChange={(e) => checkLog(y, e)}
                      />
                      Plot Y-axis on log scale
                    </Label>
                  </FormGroup>
                </Col>
              </Row>
            </Container>
          </Collapse>
        </Row>
      </Container>
    </Card>
  );
}

/**
 * Returns current year using local date.
 */
function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Returns a sorted array of numbers from `n` to `m`.
 * @param n
 * @param m
 * @param descending
 */
function getNToM(n: number, m: number, descending = false): Array<number> {
  const nums = [];
  for (let i = n; i <= m; i++) {
    nums.push(i);
  }
  return descending ? nums.sort((a, b) => b - a) : nums;
}

/**
 * Returns possible years for the datepicker.
 */
function getYears(): Array<number> {
  return getNToM(1900, getCurrentYear(), true);
}

/**
 * Returns possible months for the datepicker.
 */
function getMonths(): Array<number> {
  return getNToM(1, 12, true);
}

/**
 * Returns possible days for the datepicker.
 */
function getDays(): Array<number> {
  return getNToM(1, 31, true);
}

/**
 * Selects a year for the datepicker.
 * @param date
 * @param event
 */
function selectYear(
  date: DateInfoWrapper,
  event: React.ChangeEvent<HTMLInputElement>
) {
  date.setYear(Number.parseInt(event.target.value));
}

/**
 * Selects a month for the datepicker.
 * @param date
 * @param event
 */
function selectMonth(
  date: DateInfoWrapper,
  event: React.ChangeEvent<HTMLInputElement>
) {
  date.setMonth(Number.parseInt(event.target.value));
}

/**
 * Selects a day for the datepicker.
 */
function selectDay(
  date: DateInfoWrapper,
  event: React.ChangeEvent<HTMLInputElement>
) {
  date.setDay(Number.parseInt(event.target.value));
}

/**
 * Swaps the axes.
 * @param x
 * @param y
 */
function swapAxes(x: AxisWrapper, y: AxisWrapper): void {
  const [xValue, yValue] = [x.value, y.value];
  x.set(yValue);
  y.set(xValue);
}

/**
 * Toggles whether to plot per capita values for an axis.
 * @param axis
 * @param event
 */
function checkPerCapita(
  axis: AxisWrapper,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  axis.setPerCapita(event.target.checked);
}

/**
 * Toggles whether to plot an axis on log scale.
 * @param axis
 * @param event
 */
function checkLog(
  axis: AxisWrapper,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  axis.setLog(event.target.checked);
}

/**
 * Sets the lower bound for populations.
 * @param place
 * @param event
 */
function selectLowerBound(
  place: PlaceInfoWrapper,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  place.setLowerBound(parseInt(event.target.value) || 0);
}

/**
 * Sets the upper bound for populations.
 * @param place
 * @param event
 */
function selectUpperBound(
  place: PlaceInfoWrapper,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  place.setUpperBound(parseInt(event.target.value) || 1e10);
}

export { PlotOptions };
