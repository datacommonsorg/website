import React, { useContext, useEffect } from "react";
import _ from "lodash";
import { FormGroup, Label, Input, Card, Button } from "reactstrap";
import { ScatterContext } from "./scatter2_app";
import { SearchBar } from "../timeline_search";
import { getPlaceNames } from "../timeline_util";
import { getPlacesIn } from "./scatter2_util";

import { Container, Row, Col } from "reactstrap";

function PlaceOptions(): JSX.Element {
  const context = useContext(ScatterContext);

  function selectEnclosedPlaceType(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    context.place.set({
      ...context.place.value,
      enclosedPlaceType: event.target.selectedOptions[0].value,
      enclosedPlaces: [],
    });
    context.x.set({
      ...context.x.value,
      data: [],
      populations: [],
    });
    context.y.set({
      ...context.y.value,
      data: [],
      populations: [],
    });
  }

  async function selectEnclosingPlace(dcid: string) {
    const dcidToName = await getPlaceNames([dcid]);
    context.place.set({
      ...context.place.value,
      enclosedPlaces: [],
      enclosingPlace: { dcid: dcid, name: dcidToName[dcid] },
    });
    context.x.set({
      ...context.x.value,
      data: [],
      populations: [],
    });
    context.y.set({
      ...context.y.value,
      data: [],
      populations: [],
    });
  }

  function unselectEnclosingPlace() {
    context.place.set({
      ...context.place.value,
      enclosedPlaces: [],
      enclosingPlace: { dcid: "", name: "" },
    });
  }

  const enclosedTypes = [
    "CensusCoreBasedStatisticalArea",
    "CensusCountyDivision",
    "CensusTract",
    "City",
    "CongressionalDistrict",
    "County",
    "HighSchoolDistrict",
    "SchoolDistrict",
    "State",
    "StateComponent",
  ];

  useEffect(() => {
    const shouldGetPlaces =
      context.place.value.enclosedPlaceType &&
      context.place.value.enclosingPlace.dcid &&
      _.isEmpty(context.place.value.enclosedPlaces);
    if (!shouldGetPlaces) {
      return;
    }
    getPlacesIn(
      context.place.value.enclosingPlace.dcid,
      context.place.value.enclosedPlaceType
    ).then((dcids) => {
      if (!_.isEmpty(dcids)) {
        getPlaceNames(dcids).then((dcidToName) => {
          context.place.set({
            ...context.place.value,
            enclosedPlaces: dcids.map((dcid) => ({
              name: dcidToName[dcid],
              dcid: dcid,
            })),
          });
        });
      } else {
        // TODO: Show error.
        alert(
          `Sorry, ${context.place.value.enclosingPlace.name} does not contain places of type ${context.place.value.enclosedPlaceType}`
        );
      }
    });
  }, [context.place.value]);

  return (
    <Card>
      <Container>
        <Row>
          <Col xs="auto">Plot places of type</Col>
          <Col>
            <select
              className="custom-select"
              value={context.place.value.enclosedPlaceType}
              onChange={selectEnclosedPlaceType}
            >
              <option value="">Select a place type</option>
              {enclosedTypes.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </select>
          </Col>
        </Row>
        <Row>
          <Col xs="auto">in</Col>
          <Col>
            <div id="search">
              <SearchBar
                places={
                  context.place.value.enclosingPlace.dcid
                    ? {
                        [context.place.value.enclosingPlace.dcid]:
                          context.place.value.enclosingPlace.name,
                      }
                    : {}
                }
                addPlace={selectEnclosingPlace}
                removePlace={unselectEnclosingPlace}
                numPlacesLimit={1}
              />
            </div>
          </Col>
        </Row>
      </Container>
    </Card>
  );
}

function PlotOptions(): JSX.Element {
  const context = useContext(ScatterContext);

  function checkPerCapitaX(event: React.ChangeEvent<HTMLInputElement>) {
    context.x.set({ ...context.x.value, perCapita: event.target.checked });
  }

  function checkPerCapitaY(event: React.ChangeEvent<HTMLInputElement>) {
    context.y.set({ ...context.y.value, perCapita: event.target.checked });
  }

  function checkSwap() {
    const [x, y] = [context.x.value, context.y.value];
    context.x.set(y);
    context.y.set(x);
  }

  function checkLogX(event: React.ChangeEvent<HTMLInputElement>) {
    context.x.set({ ...context.x.value, log: event.target.checked });
  }

  function checkLogY(event: React.ChangeEvent<HTMLInputElement>) {
    context.y.set({ ...context.y.value, log: event.target.checked });
  }

  function setLowerBound(event: React.ChangeEvent<HTMLInputElement>) {
    context.place.set({
      ...context.place.value,
      lowerBound: parseInt(event.target.value) || 0,
    });
  }

  function setUpperBound(event: React.ChangeEvent<HTMLInputElement>) {
    context.place.set({
      ...context.place.value,
      upperBound: parseInt(event.target.value) || 1e10,
    });
  }

  return (
    <Card>
      <Container>
        <Row>
          <Col>Only plot places of this size</Col>
          <Col>
            <FormGroup check>
              <Input
                type="number"
                onChange={setLowerBound}
                value={context.place.value.lowerBound}
              />
            </FormGroup>
          </Col>
          <Col xs="auto">to</Col>
          <Col>
            <FormGroup check>
              <Input
                type="number"
                onChange={setUpperBound}
                value={
                  context.place.value.upperBound === Number.POSITIVE_INFINITY
                    ? 1e10
                    : context.place.value.upperBound
                }
              />
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col xs="auto">Plot Options</Col>
          <Col>
            <Button size="sm" color="light" onClick={checkSwap}>
              Swap X and Y axes
            </Button>
          </Col>
          <Col>
            <FormGroup check>
              <Label check>
                <Input
                  type="checkbox"
                  checked={context.x.value.perCapita}
                  onChange={checkPerCapitaX}
                />
                Plot X-axis per capita
              </Label>
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input
                  type="checkbox"
                  checked={context.y.value.perCapita}
                  onChange={checkPerCapitaY}
                />
                Plot Y-axis per capita
              </Label>
            </FormGroup>
          </Col>
          <Col>
            <FormGroup check>
              <Label check>
                <Input
                  type="checkbox"
                  checked={context.x.value.log}
                  onChange={checkLogX}
                />
                Plot X-axis on log scale
              </Label>
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input
                  type="checkbox"
                  checked={context.y.value.log}
                  onChange={checkLogY}
                />
                Plot Y-axis on log scale
              </Label>
            </FormGroup>
          </Col>
        </Row>
      </Container>
    </Card>
  );
}

export { PlaceOptions, PlotOptions };
