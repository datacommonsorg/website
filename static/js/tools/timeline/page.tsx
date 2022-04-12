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

import axios from "axios";
import _ from "lodash";
import React, { Component } from "react";

import { SearchBar } from "../../shared/place_search_bar";
import { getStatVarInfo, StatVarInfo } from "../../shared/stat_var";
import { NamedPlace, StatVarHierarchyType } from "../../shared/types";
import { DrawerToggle } from "../../stat_var_hierarchy/drawer_toggle";
import { StatVarHierarchy } from "../../stat_var_hierarchy/stat_var_hierarchy";
import { getPlaceNames } from "../../utils/place_utils";
import { ChartRegion } from "./chart_region";
import { Info } from "./info";
import {
  Button,
  Card,
  Col,
  Container,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
} from "reactstrap";
import {
  addToken,
  getTokensFromUrl,
  placeSep,
  removeToken,
  setTokensToUrl,
  statVarSep,
  TIMELINE_URL_PARAM_KEYS,
} from "./util";

interface PageStateType {
  placeName: Record<string, string>;
  statVarInfo: Record<string, StatVarInfo>;
  showSvWidget: boolean;
}

class Page extends Component<unknown, PageStateType> {
  constructor(props: unknown) {
    super(props);
    this.fetchDataAndRender = this.fetchDataAndRender.bind(this);
    this.addPlaceAction = this.addPlaceAction.bind(this);
    this.state = {
      placeName: {},
      statVarInfo: {},
      showSvWidget: false,
    };
    this.toggleSvWidget = this.toggleSvWidget.bind(this);
  }

  componentDidMount(): void {
    window.addEventListener("hashchange", this.fetchDataAndRender);
    this.fetchDataAndRender();
  }

  private fetchDataAndRender(): void {
    const places = Array.from(
      getTokensFromUrl(TIMELINE_URL_PARAM_KEYS.PLACE, placeSep)
    );
    const statVars = Array.from(
      getTokensFromUrl(TIMELINE_URL_PARAM_KEYS.STAT_VAR, statVarSep)
    );
    let statVarInfoPromise = Promise.resolve({});
    if (statVars.length !== 0) {
      statVarInfoPromise = getStatVarInfo(statVars);
    }
    let placesPromise = Promise.resolve({});
    if (places.length !== 0) {
      placesPromise = getPlaceNames(places);
    }
    Promise.all([statVarInfoPromise, placesPromise]).then(
      ([statVarInfo, placeName]) => {
        // Schemaless stat vars are not associated with any triples.
        // Assign the measured property to be the DCID so the chart can be
        // grouped (by measured property).
        for (const statVar of statVars) {
          if (!(statVar in statVarInfo)) {
            statVarInfo[statVar] = { mprop: statVar };
          }
        }
        this.setState({
          statVarInfo,
          placeName,
        });
      }
    );
  }

  private toggleSvWidget(): void {
    this.setState({
      showSvWidget: !this.state.showSvWidget,
    });
  }

  render(): JSX.Element {
    const numPlaces = Object.keys(this.state.placeName).length;
    const numStatVarInfo = Object.keys(this.state.statVarInfo).length;
    const namedPlaces: NamedPlace[] = [];
    for (const place in this.state.placeName) {
      namedPlaces.push({ dcid: place, name: this.state.placeName[place] });
    }
    const statVarTokens = Array.from(
      getTokensFromUrl(TIMELINE_URL_PARAM_KEYS.STAT_VAR, statVarSep)
    );
    const statVars = statVarTokens.map((sv) =>
      sv.includes("|") ? sv.split("|")[0] : sv
    );
    // TODO(beets): Factor out stat var widget related elements into a separate component.
    return (
      <>
        <div className="d-none d-lg-flex explore-menu-container" id="explore">
          <DrawerToggle
            collapseElemId="explore"
            visibleElemId="stat-var-hierarchy-section"
          />
          <StatVarHierarchy
            type={StatVarHierarchyType.TIMELINE}
            places={namedPlaces}
            selectedSVs={statVars}
            selectSV={(sv) => {
              addToken(TIMELINE_URL_PARAM_KEYS.STAT_VAR, statVarSep, sv);
            }}
            deselectSV={(sv) => {
              removeToken(TIMELINE_URL_PARAM_KEYS.STAT_VAR, statVarSep, sv);
            }}
            searchLabel="Statistical Variables"
          />
        </div>
        <Modal
          isOpen={this.state.showSvWidget}
          toggle={this.toggleSvWidget}
          className="modal-dialog-centered modal-lg"
          contentClassName="modal-sv-widget"
        >
          <ModalHeader toggle={this.toggleSvWidget}>
            Select Variables
          </ModalHeader>
          <ModalBody>
            <StatVarHierarchy
              type={StatVarHierarchyType.TIMELINE}
              places={namedPlaces}
              selectedSVs={statVars}
              selectSV={(sv) => {
                addToken(TIMELINE_URL_PARAM_KEYS.STAT_VAR, statVarSep, sv);
              }}
              deselectSV={(sv) => {
                removeToken(TIMELINE_URL_PARAM_KEYS.STAT_VAR, statVarSep, sv);
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={this.toggleSvWidget}>
              Done
            </Button>
          </ModalFooter>
        </Modal>
        <div id="plot-container">
          <Container fluid={true}>
            {numPlaces === 0 && <h1 className="mb-4">Timelines Explorer</h1>}
            <Card id="place-search">
              <Row>
                <Col sm={12}>
                  <p>Select places:</p>
                </Col>
                <Col sm={12}>
                  <SearchBar
                    places={this.state.placeName}
                    addPlace={(place) => {
                      this.addPlaceAction(place);
                    }}
                    removePlace={(place) => {
                      removeToken(
                        TIMELINE_URL_PARAM_KEYS.PLACE,
                        placeSep,
                        place
                      );
                    }}
                  />
                </Col>
              </Row>
              <Row className="d-lg-none">
                <Col>
                  <Button color="primary" onClick={this.toggleSvWidget}>
                    Select variables
                  </Button>
                </Col>
              </Row>
            </Card>
            {numPlaces === 0 && <Info />}
            {numPlaces !== 0 && numStatVarInfo !== 0 && (
              <div id="chart-region">
                <ChartRegion
                  placeName={this.state.placeName}
                  statVarInfo={this.state.statVarInfo}
                  statVarOrder={statVars}
                ></ChartRegion>
              </div>
            )}
          </Container>
        </div>
      </>
    );
  }

  private addPlaceAction(place: string): void {
    // We only need to check the availability of selected stat vars when adding
    // the first place (ie. when the current list of places is empty) because
    // we take the union of the eligible stat vars for all places.
    if (!_.isEmpty(this.state.statVarInfo) && _.isEmpty(this.state.placeName)) {
      axios
        .post("/api/place/stat-vars/union", {
          dcids: [place],
          statVars: Object.keys(this.state.statVarInfo),
        })
        .then((resp) => {
          const availableSVs: string[] = resp.data;
          const unavailableSV = [];
          for (const sv in this.state.statVarInfo) {
            if (availableSVs.indexOf(sv) === -1) {
              unavailableSV.push(this.state.statVarInfo[sv].title || sv);
            }
          }
          const placeTokenInfo = {
            name: TIMELINE_URL_PARAM_KEYS.PLACE,
            sep: placeSep,
            tokens: new Set([place]),
          };
          const statVarTokenInfo = {
            name: TIMELINE_URL_PARAM_KEYS.STAT_VAR,
            sep: statVarSep,
            tokens: new Set(availableSVs),
          };
          setTokensToUrl([placeTokenInfo, statVarTokenInfo]);
          if (!_.isEmpty(unavailableSV)) {
            alert(
              `Sorry, the selected variable(s) [${unavailableSV.join(", ")}] ` +
                "are not available for the chosen place."
            );
          }
        })
        .catch(() => addToken(TIMELINE_URL_PARAM_KEYS.PLACE, placeSep, place));
    } else {
      addToken(TIMELINE_URL_PARAM_KEYS.PLACE, placeSep, place);
    }
  }
}

export { Page };
