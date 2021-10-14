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

import {
  AxisWrapper,
  Context,
  DisplayOptionsWrapper,
  PlaceInfoWrapper,
} from "./context";
import { Button, Card, FormGroup, Input, Label } from "reactstrap";
import { Col, Container, Row } from "reactstrap";
import React, { useContext, useState } from "react";

// TODO: Add a new API that given a statvar, a parent place, and a child type,
// returns the available dates for the statvar. Then, fill the datapicker with
// the dates.
function PlotOptions(): JSX.Element {
  const { place, x, y, display } = useContext(Context);
  const [lowerBound, setLowerBound] = useState(
    place.value.lowerBound.toString()
  );
  const [upperBound, setUpperBound] = useState(
    place.value.upperBound.toString()
  );
  return (
    <Card id="plot-options">
      <Container>
        <Row className="plot-options-row">
          <Col sm={1} className="plot-options-label">
            Per capita:
          </Col>
          <Col sm="auto">
            <FormGroup check>
              <Label check>
                <Input
                  id="per-capita-x"
                  type="checkbox"
                  checked={x.value.perCapita}
                  onChange={(e) => checkPerCapita(x, e)}
                />
                X-axis
              </Label>
            </FormGroup>
          </Col>
          <Col sm="auto">
            <FormGroup check>
              <Label check>
                <Input
                  id="per-capita-y"
                  type="checkbox"
                  checked={y.value.perCapita}
                  onChange={(e) => checkPerCapita(y, e)}
                />
                Y-axis
              </Label>
            </FormGroup>
          </Col>
        </Row>
        <Row className="plot-options-row">
          <Col sm={1} className="plot-options-label">
            Log scale:
          </Col>
          <Col sm="auto">
            <FormGroup check>
              <Label check>
                <Input
                  id="log-x"
                  type="checkbox"
                  checked={x.value.log}
                  onChange={(e) => checkLog(x, e)}
                />
                X-axis
              </Label>
            </FormGroup>
          </Col>
          <Col sm="auto">
            <FormGroup check>
              <Label check>
                <Input
                  id="log-y"
                  type="checkbox"
                  checked={y.value.log}
                  onChange={(e) => checkLog(y, e)}
                />
                Y-axis
              </Label>
            </FormGroup>
          </Col>
        </Row>
        <Row className="plot-options-row centered-items-row">
          <Col sm={1} className="plot-options-label">
            Display:
          </Col>
          <Col sm="auto">
            <Button
              id="swap-axes"
              size="sm"
              color="light"
              onClick={() => swapAxes(x, y)}
              className="plot-options-swap-button"
            >
              Swap X and Y axes
            </Button>
          </Col>
          <Col sm="auto">
            <FormGroup check>
              <Label check>
                <Input
                  id="quadrants"
                  type="checkbox"
                  checked={display.showQuadrants}
                  onChange={(e) => checkQuadrants(display, e)}
                />
                Show quadrants
              </Label>
            </FormGroup>
          </Col>
          <Col sm="auto">
            <FormGroup check>
              <Label check>
                <Input
                  id="quadrants"
                  type="checkbox"
                  checked={display.showLabels}
                  onChange={(e) => checkLabels(display, e)}
                />
                Show labels
              </Label>
            </FormGroup>
          </Col>
          <Col sm="auto">
            <FormGroup check>
              <Label check>
                <Input
                  id="density"
                  type="checkbox"
                  checked={display.showDensity}
                  onChange={(e) => checkDensity(display, e)}
                />
                Show density
              </Label>
            </FormGroup>
          </Col>
        </Row>
        <Row className="plot-options-row centered-items-row">
          <Col sm={2} className="plot-options-label">
            Filter by population:
          </Col>
          <Col sm="auto">
            <FormGroup check>
              <Input
                type="number"
                onChange={(e) => selectLowerBound(place, e, setLowerBound)}
                value={lowerBound}
                onBlur={() => setLowerBound(place.value.lowerBound.toString())}
              />
            </FormGroup>
          </Col>
          <Col sm="auto">to</Col>
          <Col sm="auto">
            <FormGroup check>
              <Input
                type="number"
                onChange={(e) => selectUpperBound(place, e, setUpperBound)}
                value={upperBound}
                onBlur={() => setUpperBound(place.value.upperBound.toString())}
              />
            </FormGroup>
          </Col>
        </Row>
      </Container>
    </Card>
  );
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
 * Toggles whether to show quadrant lines.
 */
function checkQuadrants(
  display: DisplayOptionsWrapper,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  display.setQuadrants(event.target.checked);
}

/**
 * Toggles whether to show text labels for every dot.
 */
function checkLabels(
  display: DisplayOptionsWrapper,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  display.setLabels(event.target.checked);
}

/**
 * Toggles whether to color dots by density of dots in that area.
 */
function checkDensity(
  display: DisplayOptionsWrapper,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  display.setDensity(event.target.checked);
}

/**
 * Sets the lower bound for populations.
 * @param place
 * @param event
 */
function selectLowerBound(
  place: PlaceInfoWrapper,
  event: React.ChangeEvent<HTMLInputElement>,
  setLowerBound: (lowerBound: string) => void
): void {
  if (event.target.value) {
    place.setLowerBound(parseInt(event.target.value));
  }
  setLowerBound(event.target.value);
}

/**
 * Sets the upper bound for populations.
 * @param place
 * @param event
 */
function selectUpperBound(
  place: PlaceInfoWrapper,
  event: React.ChangeEvent<HTMLInputElement>,
  setUpperBound: (upperBound: string) => void
): void {
  if (event.target.value) {
    place.setUpperBound(parseInt(event.target.value));
  }
  setUpperBound(event.target.value);
}

export { PlotOptions };
