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
import statsVarPathMap from "../../data/statsvar_path.json";
import _ from "lodash";

interface StatsVarInfo {
  md: string;
  mprop: string;
  pt: string;
  pvs: { [key: string]: string };
  title: string;
}

function getPlaceNames(dcids: string[]): Promise<{ [key: string]: string }> {
  let url = "/api/place/name?";
  const urls = [];
  for (const place of dcids) {
    urls.push(`dcid=${place}`);
  }
  url += urls.join("&");
  return axios.get(url).then((resp) => {
    return resp.data;
  });
}

function getStatsVarInfo(
  dcids: string[]
): Promise<Record<string, StatsVarInfo>> {
  let url = "/api/stats/stats-var-property?";
  const urls = [];
  for (const dcid of dcids) {
    urls.push(`dcid=${dcid}`);
  }
  url += urls.join("&");
  return axios.get(url).then((resp) => {
    return resp.data;
  });
}

function getStatsVar(dcids: string[]): Promise<Set<string>> {
  if (dcids.length === 0) {
    return Promise.resolve(new Set<string>());
  }
  const promises = [];
  // ToDo: read the set of statsVars available for multiple dcids from server side
  for (const dcid of dcids) {
    promises.push(
      axios.get("/api/place/statsvars/" + dcid).then((resp) => {
        return resp.data;
      })
    );
  }
  return Promise.all(promises).then((values) => {
    let statsVars = new Set();
    for (const value of values) {
      statsVars = new Set([...Array.from(statsVars), ...value]);
    }
    return statsVars;
  }) as Promise<Set<string>>;
}

const placeSep = ",";
const nodePathSep = ",";
const statsVarSep = "__";

interface StatsVarNode {
  [key: string]: { paths: string[][]; denominators?: string[] }; // key: statsVar Id, value: array of nodePath
}

interface ChartOptions {
  [key: string]: {
    // key: mprop
    pc: boolean;
  };
}
// keeps parameters used in Timeline page
// and provide methods of updating the parameters
class TimelineParams {
  statsVarNodes: StatsVarNode;
  placeDcids: string[];
  urlParams: URLSearchParams;
  listenHashChange: boolean;
  chartOptions: ChartOptions;

  constructor() {
    this.statsVarNodes = {};
    this.placeDcids = [];
    this.addStatsVar = this.addStatsVar.bind(this);
    this.removeStatsVar = this.removeStatsVar.bind(this);
    this.addPlace = this.addPlace.bind(this);
    this.removePLace = this.removePLace.bind(this);
    this.setChartPC = this.setChartPC.bind(this);
    this.urlParams = new URLSearchParams("");
    this.listenHashChange = true;
    this.chartOptions = {};
  }

  // set PerCaptia for a chart
  public setChartPC(groupId: string, pc: boolean): boolean {
    if (!this.chartOptions || !(groupId in this.chartOptions)) {
      this.chartOptions[groupId] = { pc: pc };
      return pc === true;
    } else if (this.chartOptions[groupId].pc !== pc) {
      this.chartOptions[groupId].pc = pc;
      return true;
    }
    return false;
  }

  // add one new place, return true if this.placeDcids changed
  public addPlace(placeDcid: string): boolean {
    if (!this.placeDcids.includes(placeDcid)) {
      this.placeDcids.push(placeDcid);
      return true;
    }
    return false;
  }

  // remove one place, return true if this.placeDcids changed
  public removePLace(placeDcid: string): boolean {
    const index = this.placeDcids.indexOf(placeDcid);
    if (index !== -1) {
      this.placeDcids.splice(index, 1);
      return true;
    }
    return false;
  }

  // add one statsVar with Path, return true if this.statsVarNodes changed
  public addStatsVar(
    statsVar: string,
    nodePath: string[],
    denominators: string[]
  ): boolean {
    const node = this.statsVarNodes[statsVar];
    if (!node) {
      this.statsVarNodes[statsVar] = {
        paths: [nodePath],
        denominators: denominators,
      };
      return true;
    } else if (
      _.findIndex(node.paths, function (obj) {
        return _.isEqual(obj, nodePath);
      }) === -1
    ) {
      node.paths.push(nodePath);
      return true;
    } else if (!_.isEqual(node.denominators, denominators)) {
      node.denominators = denominators;
      return true;
    }
    return false;
  }

  // delete one statsVar, return true if this.statsVarNodes changed
  public removeStatsVar(statsVar: string, nodePath: string[] = []): boolean {
    if (statsVar in this.statsVarNodes) {
      // if Path is not provided, delete all nodes of the statsVar
      if (nodePath.length === 0) {
        delete this.statsVarNodes[statsVar];
        return true;
      }
      // if Path is provided, delete the statsVar with the same Path only
      else {
        const idx = _.findIndex(this.statsVarNodes[statsVar].paths, function (
          obj
        ) {
          return _.isEqual(obj, nodePath);
        });
        if (idx !== -1) {
          this.statsVarNodes[statsVar].paths.splice(idx, 1);
          if (this.statsVarNodes[statsVar].paths.length === 0) {
            delete this.statsVarNodes[statsVar];
          }
          return true;
        }
      }
    }
    return false;
  }

  // set places in url
  public setUrlPlaces(): void {
    this.urlParams.set("place", this.placeDcids.join(placeSep));
    this.listenHashChange = false;
    window.location.hash = this.urlParams.toString();
  }

  // set statsVars in url
  public setUrlStatsVars(): void {
    const statsVarArray = [];
    for (const statsVar in this.statsVarNodes) {
      statsVarArray.push(
        statsVar +
          nodePathSep +
          this.statsVarNodes[statsVar].paths.join(nodePathSep) +
          nodePathSep +
          this.statsVarNodes[statsVar].denominators.join(nodePathSep)
      );
    }
    this.urlParams.set("statsVar", statsVarArray.join(statsVarSep));
    this.listenHashChange = false;
    window.location.hash = this.urlParams.toString();
  }

  // set chartOptions in url
  public setUrlChartOptions(): void {
    const chartOptions = encodeURIComponent(JSON.stringify(this.chartOptions));
    this.urlParams.set("chart", chartOptions);
    this.listenHashChange = false;
    window.location.hash = this.urlParams.toString();
  }

  // get the dcids of all the statsVars
  public getStatsVarDcids(): string[] {
    return Object.keys(this.statsVarNodes);
  }

  // get the path of all the nodes
  public getStatsVarPaths(): string[][] {
    const statsVarPaths = [];
    for (const statsVar in this.statsVarNodes) {
      for (const nodePath of this.statsVarNodes[statsVar].paths) {
        statsVarPaths.push(nodePath);
      }
    }
    return statsVarPaths;
  }

  // get the timeline parameters from the url
  public getParamsFromUrl(): void {
    // get the url, remove the leading hash symbol "#"
    this.urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
    this.statsVarNodes = {};
    this.placeDcids = [];

    // set places
    const places = this.urlParams.get("place");
    if (places) {
      for (const place of places.split(placeSep)) {
        this.addPlace(place);
      }
    }

    // set statsVars
    const statsVars = this.urlParams.get("statsVar");
    if (statsVars) {
      for (const statsVarString of statsVars.split(statsVarSep)) {
        const statsVarInfo = statsVarString.split(nodePathSep);
        // if statsVar path is not included in url
        // load the path from pre-built map
        if (statsVarInfo.length === 1) {
          if (statsVarInfo[0] in statsVarPathMap) {
            this.addStatsVar(
              statsVarInfo[0],
              statsVarPathMap[statsVarInfo[0]].map((x: number) => x.toString()),
              // TODO: Consider adding denominators to the pre-built map
              []
            );
          } else {
            this.addStatsVar(statsVarInfo[0], [], []);
          }
        } else {
          const pathsAndDenominators = statsVarInfo.splice(1);
          this.addStatsVar(
            statsVarInfo[0],
            pathsAndDenominators.filter(
              (elem) => "0" <= elem[0] && elem[0] <= "9"
            ),
            pathsAndDenominators.filter(
              (elem) => "0" > elem[0] || elem[0] > "9"
            )
          );
        }
      }
    }
    const chartOptions = JSON.parse(
      decodeURIComponent(this.urlParams.get("chart"))
    );
    if (chartOptions) {
      this.chartOptions = chartOptions;
    } else {
      this.chartOptions = {};
    }
  }
}

export {
  StatsVarInfo,
  getStatsVarInfo,
  getPlaceNames,
  getStatsVar,
  TimelineParams,
  StatsVarNode,
  ChartOptions,
};
