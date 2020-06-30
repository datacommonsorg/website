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

import React from "react";
import ReactDOM from "react-dom";
import _ from "lodash";
import * as plot from "./plot";
import * as util from "./util";

import {
  ArcGroupTitle,
  ArcGroupComparativeTitle,
  ArcGroupTextContent,
  ObsCount,
  VSelect,
} from "./kg_template.jsx";

const /** !Array<string> */ VALUE_KEYS = [
    "measuredValue",
    "medianValue",
    "meanValue",
    "percentValue",
    "growthRate",
    "stdDeviationValue",
  ];

const MAX_V = 5;

/**
 * Observation chart.
 */
class ObservationChart {
  /**
   * @param {!Element} chartEl The chart element.
   * @param {!Array<!Object<string, string|number|!Object<string,string>>>}
   *     textData Data to display the text part.
   * @param {!Array<!Object<string, string|number|!Date>>}
   *     chartData Observation data to draw the chart.
   * @param {string} type Node type.
   * @param {boolean} textView Whether it's text view mode.
   * @param {?Object<?string, ?string>} pvs The pv values for Population node.
   * @param {string} measuredProperty Measured property of the observation.
   * @param {boolean=} richTitle Whether to use rich title for the chart.
   */
  constructor(
    chartEl,
    textData,
    chartData,
    type,
    textView,
    pvs,
    measuredProperty,
    richTitle = false
  ) {
    /** @private @const {!Element} */
    this.chartEl_ = chartEl;

    /** @private @const {!Array<!Object<string, string|number>>} */
    this.textData_ = textData;

    /** @private {!Array<!Object<string, string|number|!Date>>} */
    this.chartData_ = chartData;

    /** @private @const {string} */
    this.type_ = type;

    /** @private @const {boolean} */
    this.textView_ = textView;

    /** @private @const {?Object<string, string>} */
    this.pvs_ = pvs;

    /** @private @const {string} */
    this.measuredProperty_ = measuredProperty;

    /** @private @const {boolean} */
    this.richTitle_ = richTitle;

    /** @private {!Array<string>} */
    this.extraPs_ = [];

    /**
     * @private
     * {!Object<string, !Array<!Object<string, string|number|Date>>>}
     */
    this.plotData_ = [];

    /** @private {string} */
    this.valueKey_ = "";

    /** @private {string} */
    this.svgId_ = "";

    /** @private {!Array<string>} */
    this.vList_ = [];

    /**
     * A sample data to derive some properties to use in the chart.
     * @private @const
     * {!Object<string, string|number|!Object<string,string>>}
     */
    this.sample_ = textData[0];

    /**
     * The pvs of the other parent of the comparative observation
     * @private {?Object<string, string>} */
    this.otherParentPvs_ = {};

    /**
     * A string representation of the pvs of the observed node of the
     * comparative observation.
     * @private {string}
     */
    this.obsNodePvContent_ = "";

    /**
     * A string representation of the pvs of the compared node of the
     * comparative observation.
     * @private {string}
     */
    this.compNodePvContent_ = "";

    this.getExtraPs_();
  }

  /**
   * Gets extra p values when compared with the parent population.
   * @private
   */
  getExtraPs_() {
    if (this.pvs_ !== null && this.sample_["pvs"] instanceof Object) {
      const sample_ps = Object.keys(this.sample_["pvs"]);
      this.extraPs_ = sample_ps.filter(
        (p) => !Object.keys(this.pvs_).includes(p)
      );
    }
  }

  /**
   * Should be called if the observation chart is for a comparative observation.
   * Stores the pvs of the other parent of the comparative observation.
   */
  handleOtherParentPvs(otherParentPvs) {
    this.otherParentPvs_ = otherParentPvs;
    this.getObsCompContent_();
  }

  /**
   * Gets a string representation of observed node PVs and a string
   * representation of the compared node PVs.
   * @private
   */
  getObsCompContent_() {
    var obs_pvs;
    var comp_pvs;
    if (this.sample_["parentDcid"] == this.sample_["observedNode"]) {
      obs_pvs = this.pvs_;
      comp_pvs = this.otherParentPvs_;
    } else {
      obs_pvs = this.otherParentPvs_;
      comp_pvs = this.pvs_;
    }
    this.obsNodePvContent_ = Object.entries(obs_pvs)
      .map((x) => x.join("="))
      .join(",");
    this.compNodePvContent_ = Object.entries(comp_pvs)
      .map((x) => x.join("="))
      .join(",");
  }

  /**
   * Add the extra property values text for each observation data.
   * @private
   */
  addVText_() {
    let popDcidToPvs = {};
    for (const pop of this.textData_) {
      popDcidToPvs[pop["dcid"]] = pop["pvs"];
    }
    for (const obs of this.chartData_) {
      const pvs = popDcidToPvs[obs["parentDcid"]];
      let extraVs = [];
      for (const p of this.extraPs_) {
        // Remove USC_, BLS_ ...
        let v = pvs[p];
        if (!v.startsWith("COVID")) {
          v = v.replace(/^.*?_/, "");
        }
        extraVs.push(v);
      }
      obs["vText"] = extraVs.join("--");
    }
  }

  /**
   * Get the data for plotting from raw observation data.
   * @private
   */
  getPlotData_() {
    for (const d of this.chartData_) {
      if ("observationDate" in d) {
        d["time"] = Date.parse(d["observationDate"]);
      }
    }

    const fullPropSet = this.chartData_
      .map((obsData) => new Set(Object.keys(obsData)))
      .reduce((props, otherProps) => new Set([...props, ...otherProps]));
    // Group data by measuredProperty.
    let dataGroup = _.groupBy(this.chartData_, (d) => d["measuredProperty"]);

    // Pick the measured property if only asking for one.
    const allProp = Object.keys(dataGroup);
    const oneProp = allProp.includes("count") ? "count" : allProp[0];
    for (const prop in dataGroup) {
      if (prop != oneProp) {
        continue;
      }
      let data = dataGroup[prop];
      const sample = data[0];
      for (const valueKey of VALUE_KEYS) {
        if (fullPropSet.has(valueKey)) {
          this.valueKey_ = valueKey;
          // Filter data based on valueKey and observationPeriod.
          data = data.filter((d) => valueKey in d);
          for (const obs_key of util.OBS_KEYS) {
            if (obs_key in sample) {
              data = data.filter((d) => d[obs_key] === sample[obs_key]);
            }
          }
          // Update data fields.
          data.forEach((d) => (d[valueKey] = Number(d[valueKey])));
          // Group data by v list.
          this.plotData_ = _.groupBy(data, (d) => d["vText"]);
          // Less than 3 time points, get the latest timepoint to plot.
          if (Object.values(this.plotData_)[0].length < 3) {
            const dataByTime = _.groupBy(data, (d) => d["time"]);
            const len = Object.keys(dataByTime).length;
            const timeKey = Object.keys(dataByTime).sort()[len - 1];
            this.plotData_ = _.groupBy(dataByTime[timeKey], (d) => d["vText"]);
          }
          // Sort each series by time.
          for (const key in this.plotData_) {
            this.plotData_[key].sort((a, b) => {
              if (a["time"] < b["time"]) return -1;
              else if (a["time"] > b["time"]) return 1;
              else return 0;
            });
          }
          return;
        }
      }
    }
  }

  /** @private */
  renderTitle_() {
    let elem = document.createElement("div");
    if (util.isPopulation(this.type_)) {
      const popType = this.sample_["type"];
      // Sub population contains extra pvs. Need them for display.
      const pvContent = Object.entries(this.pvs_)
        .map((x) => x.join("="))
        .join(",");
      const extraPText = this.extraPs_.join(",");
      // Renders the title element.
      ReactDOM.render(
        <ArcGroupTitle
          arcType={this.measuredProperty_}
          subject={popType}
          pvContent={pvContent}
          extraPText={extraPText}
        />,
        elem
      );
    } else if (util.isComparativeObservation(this.type_)) {
      ReactDOM.render(
        <ArcGroupComparativeTitle
          arcType={util.COMPARATIVE_OBSERVATION}
          subject={this.sample_["measuredProperty"]}
          obsPvContent={this.obsNodePvContent_}
          compPvContent={this.compNodePvContent_}
          obsNode={this.sample_["observedNode"]}
          compNode={this.sample_["comparedNode"]}
          compOperator={this.sample_["comparisonOperator"]}
        />,
        elem
      );
    } else if (util.isObservation(this.type_)) {
      ReactDOM.render(
        <ArcGroupTitle
          arcType={util.OBSERVATION}
          subject={
            this.sample_["measuredProperty"] +
            " " +
            util.getStatsString(this.sample_, this.richTitle_)
          }
        />,
        elem
      );
    }
    this.chartEl_.appendChild(elem);
  }

  /** @private */
  renderText_() {
    const propName = util.isPopulation(this.type_)
      ? "location"
      : "observedNode";

    let elem = document.createElement("div");
    ReactDOM.render(
      <ArcGroupTextContent
        propName={propName}
        arcs={this.textData_}
        textView={true}
      />,
      elem
    );
    util.setElementShown(elem.getElementsByTagName("table")[0], this.textView_);
    this.chartEl_.appendChild(elem);
  }

  /** @private */
  createSvg_() {
    // Create the svg element.
    this.svgId_ = util.randDomId();
    const svgElem = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svgElem.setAttribute("id", this.svgId_);
    svgElem.setAttribute("class", "chart-view");
    this.chartEl_.appendChild(svgElem);
    util.setElementShown(svgElem, !this.textView_);
  }

  /** @private */
  renderSvg_() {
    const svgNode = document.getElementById(this.svgId_);
    svgNode.innerHTML = "";
    const seriesArray = [];
    for (const key of this.vList_) {
      seriesArray.push(this.plotData_[key]);
    }
    if (seriesArray.length === 0) {
      return;
    }
    const svgSelector = "#" + this.svgId_;
    if (seriesArray[0].length === 1) {
      if (seriesArray.length === 1) {
        svgNode.parentNode.removeChild(svgNode);
        const textEl = this.chartEl_.getElementsByClassName("node-table")[0];
        textEl.classList.remove("text-view");
        util.setElementShown(textEl, true);
        const countEl = this.chartEl_.getElementsByClassName("count-obs")[0];
        countEl.parentNode.removeChild(countEl);
        return;
      }
      // Each series array should only contain one point.
      plot.drawBarChart(seriesArray, this.valueKey_, svgSelector);
    } else {
      plot.drawTimeSeries(seriesArray, this.valueKey_, svgSelector);
    }
  }

  /** @private */
  renderCount_() {
    // Add the count element.
    let elem = document.createElement("div");
    ReactDOM.render(<ObsCount count={this.chartData_.length} />, elem);
    util.setElementShown(elem, !this.textView_);
    this.chartEl_.appendChild(elem);
  }

  /**
   * Handlers for v input events.
   * @private
   */
  handleVInput_() {
    // Handler for v input event.
    const inputEls = this.chartEl_.getElementsByClassName("v-select-input");
    _.forEach(inputEls, (inputEl) => {
      inputEl.addEventListener("click", (e) => {
        this.vList_ = [];
        _.forEach(inputEls, (el) => {
          if (el.checked) {
            this.vList_.push(el.value);
          }
        });
        this.renderSvg_();
      });
    });
  }

  /**
   * Renders the v select popup.
   * @private
   */
  initVList_() {
    const vList = Object.keys(this.plotData_);
    if (this.extraPs_.length === 1) {
      const p = this.extraPs_[0];
      let /** !Array<string> */ orderList = [];
      if (p === "education") {
        orderList = [
          "",
          "RegularHighSchoolDiploma",
          "BachelorDegree",
          "MasterDegree",
          "DoctorateDegree",
          "ProfessionalSchoolDegree",
          "NoSchoolingCompleted",
        ];
      } else if (p === "gender" || p === "crimeType") {
        orderList = ["", "Total"];
      }
      if (orderList.length > 0) {
        vList.sort((a, b) => {
          const ia = orderList.indexOf(a);
          const ib = orderList.indexOf(b);
          return ia * ib * (ia - ib);
        });
      }
    }
    this.vList_ = vList.slice(0, MAX_V);

    // Pop animation.
    const titlePEl = this.chartEl_.getElementsByClassName("title-p")[0];
    if (titlePEl) {
      const vSelectEl = this.chartEl_.getElementsByClassName("v-select")[0];
      ReactDOM.render(<VSelect vList={vList} maxV={MAX_V} />, vSelectEl);
      vSelectEl.addEventListener("mouseleave", (e) => {
        util.setElementShown(vSelectEl, false);
      });
      titlePEl.addEventListener("mouseover", (e) => {
        util.setElementShown(vSelectEl, true);
      });
    }
  }

  /** @private */
  renderChart_() {
    if (this.chartData_.length > 0) {
      this.addVText_();
      this.getPlotData_();
      this.renderCount_();
      this.initVList_();
      this.handleVInput_();
      this.createSvg_();
      this.renderSvg_();
    }
  }

  /**
   * Render the entire observation chart.
   */
  render() {
    this.renderTitle_();
    this.renderText_();
    this.renderChart_();
  }

  /**
   * Add char data and render.
   *
   * @param {!Array<!Object<string, string|number|!Date>>}
   *     chartData Observation data to draw the chart.
   */
  addDataAndRender(chartData) {
    this.chartData_ = chartData;
    this.renderChart_();
  }
}

export { ObservationChart };
