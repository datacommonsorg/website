/**
 * Copyright 2025 Google LLC
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
 * One.org: A component to display the places component
 */

import React, { ReactElement } from "react";

import { ScatterPlot } from "../../../../../components/elements/icons/scatter_plot";
import { Timeline } from "../../../../../components/elements/icons/timeline";
import { FileSave } from "../../components/elements/icons/file_save";
import { LocationOn } from "../../components/elements/icons/location_on";
import { TravelExplore } from "../../components/elements/icons/travel_explore";

interface ToolsProps {
  //the root of the primary data.one.org site
  primarySiteWebRoot: string;
}

export const Tools = ({ primarySiteWebRoot }: ToolsProps): ReactElement => {
  return (
    <div className="container" id="tools">
      <div className="title-container">
        <h2>Data Commons Tools</h2>
        <p className="description">
          Explore and download all data on ONE Data Commons through these tools.
        </p>
      </div>

      <div className="grid">
        <a className="tool-card" href="tools/scatter">
          <div className="icon-wrapper">
            <figure>
              <ScatterPlot />
            </figure>
          </div>
          <p className="tool-title">Scatter Plots</p>
        </a>

        <a className="tool-card" href="tools/timeline">
          <div className="icon-wrapper">
            <figure>
              <Timeline />
            </figure>
          </div>
          <p className="tool-title">Timelines</p>
        </a>

        <a className="tool-card" href="tools/map">
          <div className="icon-wrapper">
            <figure>
              <TravelExplore />
            </figure>
          </div>
          <p className="tool-title">Map Explorer</p>
        </a>

        <a className="tool-card" href={`${primarySiteWebRoot}/places`}>
          <div className="icon-wrapper">
            <figure>
              <LocationOn />
            </figure>
          </div>
          <p className="tool-title">Places</p>
        </a>

        <a className="tool-card" href="tools/download">
          <div className="icon-wrapper">
            <figure>
              <FileSave />
            </figure>
          </div>
          <p className="tool-title">Data Download</p>
        </a>
      </div>

      <p className="footer-text">
        Our regularly updated data comes from official and credible sources to
        ensure you have access to the most current information available.
      </p>
    </div>
  );
};
