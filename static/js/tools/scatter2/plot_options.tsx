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
  Axis,
  Context,
  ContextFieldType,
  ContextType,
  Place,
  setAxis,
  setLog,
  setLowerBound,
  setPerCapita,
  setUpperBound,
} from "./context";

import { Container, Row, Col } from "reactstrap";

function PlotOptions(): JSX.Element {
  const context = useContext(Context);

  const [open, setOpen] = useState(shouldExpandOptions(context));

  return (
    <Card>
      <Container>
        <Row>
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
              Options
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
                      onChange={(e) => selectLowerBound(context.place, e)}
                      value={context.place.value.lowerBound}
                    />
                  </FormGroup>
                </Col>
                <Col xs="auto">to</Col>
                <Col>
                  <FormGroup check>
                    <Input
                      type="number"
                      onChange={(e) => selectUpperBound(context.place, e)}
                      value={
                        context.place.value.upperBound ===
                        Number.POSITIVE_INFINITY
                          ? 1e10
                          : context.place.value.upperBound
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
                    onClick={() => swapAxes(context.x, context.y)}
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
                        checked={context.x.value.perCapita}
                        onChange={(e) => checkPerCapita(context.x, e)}
                      />
                      Plot X-axis per capita
                    </Label>
                  </FormGroup>
                  <FormGroup check>
                    <Label check>
                      <Input
                        id="per-capita-y"
                        type="checkbox"
                        checked={context.y.value.perCapita}
                        onChange={(e) => checkPerCapita(context.y, e)}
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
                        checked={context.x.value.log}
                        onChange={(e) => checkLog(context.x, e)}
                      />
                      Plot X-axis on log scale
                    </Label>
                  </FormGroup>
                  <FormGroup check>
                    <Label check>
                      <Input
                        id="log-y"
                        type="checkbox"
                        checked={context.y.value.log}
                        onChange={(e) => checkLog(context.y, e)}
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
 * Swaps the axes.
 * @param x
 * @param y
 */
function swapAxes(x: ContextFieldType<Axis>, y: ContextFieldType<Axis>): void {
  const [xValue, yValue] = [x.value, y.value];
  setAxis(x, yValue);
  setAxis(y, xValue);
}

/**
 * Toggles whether to plot per capita values for an axis.
 * @param axis
 * @param event
 */
function checkPerCapita(
  axis: ContextFieldType<Axis>,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  setPerCapita(axis, event.target.checked);
}

/**
 * Toggles whether to plot an axis on log scale.
 * @param axis
 * @param event
 */
function checkLog(
  axis: ContextFieldType<Axis>,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  setLog(axis, event.target.checked);
}

/**
 * Sets the lower bound for populations.
 * @param place
 * @param event
 */
function selectLowerBound(
  place: ContextFieldType<Place>,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  setLowerBound(place, parseInt(event.target.value) || 0);
}

/**
 * Sets the upper bound for populations.
 * @param place
 * @param event
 */
function selectUpperBound(
  place: ContextFieldType<Place>,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  setUpperBound(place, parseInt(event.target.value) || 1e10);
}

/**
 * Checks if any of the plot options is selected.
 * @param context
 */
function shouldExpandOptions(context: ContextType): boolean {
  return (
    context.x.value.log ||
    context.y.value.log ||
    context.x.value.perCapita ||
    context.y.value.perCapita ||
    context.place.value.lowerBound != 0 ||
    context.place.value.upperBound != 1e10
  );
}

export { PlotOptions };
