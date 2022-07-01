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
 * Main component for bio.
 */

import React from "react";
import axios from "axios";
import { GraphNodes } from "../shared/types";
import {drawDiseaseGeneAssocChart} from "./chart";
import {getDiseaseGeneAssociation} from "./data_processing_utils";
export interface PagePropType {
  dcid: string;
  nodeName: string;
}

export interface PageStateType {
  data: GraphNodes;
}
export class Page extends React.Component<PagePropType, PageStateType> {
  constructor(props: PagePropType) {
    super(props);
    this.state = { data: null };
  }

  componentDidMount(): void {
    this.fetchData();
  }
  componentDidUpdate(): void {
    const diseaseGeneAssociation = getDiseaseGeneAssociation(this.state.data);
    drawDiseaseGeneAssocChart("disease-gene-association-chart", diseaseGeneAssociation);
  }
  render(): JSX.Element {
    return <div> Disease Data</div>;
  }

  private fetchData(): void {
    axios.get("/api/disease/" + this.props.dcid).then((resp) => {
      this.setState({
        data: resp.data,
      });
    });
  }
}
