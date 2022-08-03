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
import { Button, Col, FormGroup, Input, Label, Row } from "reactstrap";

import { drawProteinInteractionGraph } from "./chart";
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
}

const CHART_ID = "protein-interaction-graph";
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
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  componentDidUpdate(prevProps: Props, prevState: State): void {
    // do nothing on parent rerender or if we've loaded the same graph twice
    if (_.isEqual(prevProps, this.props) && _.isEqual(prevState, this.state)) {
      return;
    }
    // if graph has updated to something nonempty, redraw it
    if (
      !_.isEmpty(this.state.graphData) &&
      (!_.isEqual(prevState.graphData, this.state.graphData) ||
        prevState.depth !== this.state.depth)
    ) {
      drawProteinInteractionGraph(CHART_ID, {
        linkData: this.state.graphData.linkDataNested
          .slice(0, this.state.depth + 1)
          .flat(1),
        nodeData: this.state.graphData.nodeDataNested
          .slice(0, this.state.depth + 1)
          .flat(1),
      });
      return;
    }
  }

  render(): JSX.Element {
    if (this.state.graphData === null) {
      return null;
    }
    return (
      <>
        <div id={CHART_ID}></div>
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
                onChange={(e) => {
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
                onChange={(e) => {
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
                onChange={(e) => {
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
              onClick={() => {
                this.fetchData();
              }}
            >
              Update
            </Button>
          </Col>
        </Row>
      </>
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
}
