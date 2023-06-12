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

import { drawD3Map } from "../js/chart/draw_d3_map";
import { renderBarComponent } from "../js/components/tiles/bar_tile";
import { renderLineComponent } from "../js/components/tiles/line_tile";
import { renderMapComponent } from "../js/components/tiles/map_tile";
import { renderRankingComponent } from "../js/ranking/ranking";

globalThis.datacommons = {
  drawBar: renderBarComponent,
  drawD3Map,
  drawLine: renderLineComponent,
  drawMap: renderMapComponent,
  drawRanking: renderRankingComponent,
  root: "https://datacommons.org",
};
