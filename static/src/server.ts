/**
 * Copyright 2023 Google LLC
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
import express, { Request, Response } from "express";
import { JSDOM } from "jsdom";

import { draw, fetchData } from "../../static/js/components/tiles/line_tile";

const app = express();
const port = process.env.PORT || 3030;

const apiRoot = "http://127.0.0.1:8080";

const dom = new JSDOM(
  `<html><body><div id="dom-id" style="width:500px"></div></body></html>`,
  {
    pretendToBeVisual: true,
  }
);
const window = dom.window;
global.document = dom.window.document;

(window.Text as any).prototype.getComputedTextLength = function () {
  return this.textContent.length;
};

(window.SVGElement as any).prototype.getComputedTextLength = function () {
  return this.textContent.length;
};

// JSDom does not define SVGTSpanElements, and use SVGElement instead. Defines
// a shim for getBBox (only returns width) where each character is 1 px wide.
(window.Element as any).prototype.getBBox = function () {
  let maxWidth = 0;
  const children = this.childNodes;
  for (let i = 0; i < children.length; i++) {
    maxWidth = Math.max(children[i].getComputedTextLength(), maxWidth);
  }
  return { width: maxWidth };
};

app.get("/", (req: Request, res: Response) => {
  const query = req.query.q;
  axios
    .post(`${apiRoot}/nl/data?q=${query}`)
    .then((resp) => {
      const tiles = [];
      const svSpec = [];
      const category = resp.data["config"]["categories"][0];
      for (const sv in category["statVarSpec"]) {
        svSpec.push(category["statVarSpec"][sv]);
        break;
      }
      for (const block of category["blocks"]) {
        for (const column of block["columns"]) {
          for (const tile of column["tiles"]) {
            if (tile["type"] == "LINE") {
              tiles.push(tile);
            }
          }
        }
      }
      // const tile = tiles[0];
      const id = "dom-id";
      const lineTileProp = {
        id: id,
        title: id,
        place: { name: "California", dcid: "geoId/06", types: ["State"] },
        statVarSpec: svSpec,
        svgChartHeight: 500,
        svgChartWidth: 500,
        apiRoot: apiRoot,
      };

      fetchData(lineTileProp).then((chartData) => {
        draw(lineTileProp, chartData, null);
        const svg = document.querySelector("svg");
        res.setHeader("Content-Type", "text/html");
        res.send(svg.outerHTML);
      });
    })
    .catch((error) => {
      console.error("Error making request:\n", error.message);
      res.status(500).send("Failed to make a request to the target service.");
    });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
