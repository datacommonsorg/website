/**
 * Copyright 2022 Google LLC
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
 * Protein-protein interaction graph
 */

import axios from "axios";
import _ from "lodash";
import React from "react";
import { CSVLink } from "react-csv";
import {
  Button,
  ButtonToolbar,
  Col,
  FormGroup,
  Input,
  Label,
  Row,
} from "reactstrap";

import { drawProteinInteractionGraph } from "./chart";
import {
  COLUMNS,
  ProteinProteinInteractionTable,
} from "./protein_protein_interaction_table";
import { BioDcid, MultiLevelInteractionGraphData } from "./types";

interface Props {
  centerProteinDcid: BioDcid;
}

interface State {
  // number of levels in graph, max shortest-path distance from any node to the center
  depth: number;
  // stores graph to be rendered
  graphData: MultiLevelInteractionGraphData;
  // number of expansion links per node
  numInteractions: number;
  // interaction score threshold above which to show an edge between two interacting proteins
  scoreThreshold: number;
  // show table;
  showTableView: boolean;
}

const GRAPH_ID = "protein-interaction-graph";
const DEPTH_INPUT_ID = "ppi-input-depth";
const NUM_INTERACTORS_INPUT_ID = "ppi-input-num-interactors";
const SCORE_THRESHOLD_INPUT_ID = "ppi-input-score-threshold";

const MIN_DEPTH = 1;
const MAX_DEPTH = 3;

const MIN_NUM_INTERACTORS = 0;
const MAX_NUM_INTERACTORS = 20;

const MIN_SCORE_THRESHOLD = 0;
const MAX_SCORE_THRESHOLD = 1;

const DEFAULTS = {
  DEPTH: 2,
  MAX_INTERACTIONS: 5,
  MISSING_SCORE_FILLER: -1,
  SCORE_THRESHOLD: 0.4,
};

export class ProteinProteinInteractionGraph extends React.Component<
  Props,
  State
> {
  constructor(props: Props) {
    super(props);
    this.state = {
      depth: DEFAULTS.DEPTH,
      graphData: null,
      numInteractions: DEFAULTS.MAX_INTERACTIONS,
      scoreThreshold: DEFAULTS.SCORE_THRESHOLD,
      showTableView: false,
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  componentDidUpdate(prevProps: Props, prevState: State): void {
    if (this.shouldDrawGraph(prevState)) {
      drawProteinInteractionGraph(GRAPH_ID, {
        // clone link data because d3 will replace source, target with SimulationNodeDatum objects
        // but table requires source, target to be strings
        linkData: _.cloneDeep(
          this.state.graphData.linkDataNested
            .slice(0, this.state.depth + 1)
            .flat(1)
        ),
        nodeData: this.state.graphData.nodeDataNested
          .slice(0, this.state.depth + 1)
          .flat(1),
      });
      return;
    }
    // refetch if component is updated with new center protein dcid
    if (!_.isEqual(prevProps, this.props)) {
      this.fetchData();
    }
  }

  render(): JSX.Element {
    if (this.state.graphData === null) {
      return null;
    }
    const data = this.state.graphData.linkDataNested
      .slice(0, this.state.depth + 1)
      .flat(1);
    return (
      <div className="ppi-container">
        <Row className="justify-content-end mx-0">
          <ButtonToolbar>
            <Button
              className="ppi-toggle-button btn btn-sm btn-light shadow-none mr-2"
              onClick={(): void =>
                this.setState({ showTableView: !this.state.showTableView })
              }
            >
              <i className="material-icons align-middle">
                {this.state.showTableView ? "hub" : "table_chart"}
              </i>
              <span>
                {this.state.showTableView ? " Graph View" : " Table View"}
              </span>
            </Button>
            <CSVLink
              data={data}
              headers={COLUMNS.map(({ accessor, Header }) => ({
                key: accessor,
                label: Header,
              }))}
              filename={`${this.props.centerProteinDcid
                .replace("bio/", "")
                .toLowerCase()}_links.csv`}
              enclosingCharacter={""}
            >
              <Button className="ppi-download-button btn btn-sm btn-light shadow-none">
                <i className="material-icons align-middle">download</i>
                <span>CSV</span>
              </Button>
            </CSVLink>
          </ButtonToolbar>
        </Row>
        <div className="ppi-chart-container">
          {this.state.showTableView ? (
            <ProteinProteinInteractionTable data={data} />
          ) : (
            <div id={GRAPH_ID} />
          )}
        </div>
        <Row>
          <Col md={2}>
            <FormGroup>
              <Label for={DEPTH_INPUT_ID}>Depth</Label>
              <Input
                id={DEPTH_INPUT_ID}
                className="ppi-input"
                type="number"
                min={MIN_DEPTH}
                max={MAX_DEPTH}
                onChange={(e): void => {
                  this.setState({ depth: Number(e.target.value) });
                }}
                value={this.state.depth}
              />
            </FormGroup>
          </Col>
          <Col md={2}>
            <FormGroup>
              <Label for={NUM_INTERACTORS_INPUT_ID}>Interactors</Label>
              <Input
                id={NUM_INTERACTORS_INPUT_ID}
                className="ppi-input"
                type="number"
                min={MIN_NUM_INTERACTORS}
                max={MAX_NUM_INTERACTORS}
                onChange={(e): void => {
                  this.setState({ numInteractions: Number(e.target.value) });
                }}
                value={this.state.numInteractions}
              />
            </FormGroup>
          </Col>
          <Col md={3}>
            <FormGroup>
              <Label for={SCORE_THRESHOLD_INPUT_ID}>Confidence Threshold</Label>
              <Input
                id={SCORE_THRESHOLD_INPUT_ID}
                className="ppi-input"
                type="number"
                min={MIN_SCORE_THRESHOLD}
                max={MAX_SCORE_THRESHOLD}
                step={0.1}
                onChange={(e): void => {
                  this.setState({ scoreThreshold: Number(e.target.value) });
                }}
                value={this.state.scoreThreshold}
              />
            </FormGroup>
          </Col>
          {/* align button vertically to text fields
          reference: https://stackoverflow.com/a/48017075 */}
          <Col className="form-group align-self-end" md={2}>
            <Button
              className="ppi-update-button"
              onClick={(): void => {
                this.fetchData();
              }}
            >
              Update
            </Button>
          </Col>
        </Row>
      </div>
    );
  }

  private fetchData(): void {
    axios
      .post("/api/protein/protein-protein-interaction/", {
        maxDepth: MAX_DEPTH,
        proteinDcid: this.props.centerProteinDcid,
        scoreThreshold: this.state.scoreThreshold,
        maxInteractors: this.state.numInteractions,
      })
      .then((resp) => {
        this.setState({ graphData: resp.data });
      });
  }

  private shouldDrawGraph(prevState: State): boolean {
    return (
      !this.state.showTableView &&
      !_.isEmpty(this.state.graphData) &&
      (prevState.showTableView ||
        !_.isEqual(prevState.graphData, this.state.graphData) ||
        prevState.depth !== this.state.depth)
    );
  }
}
