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

/**
 * Data Commons Web Components entry point
 */
import {
  BarComponentProps,
  GaugeComponentProps,
  HighlightComponentProps,
  LineComponentProps,
  MapComponentProps,
  PieComponentProps,
  RankingComponentProps,
  ScatterComponentProps,
  SliderComponentProps,
  TextComponentProps,
} from "./main.d";

export type { ChartEventDetail, ChartSortOption } from "./main.d";

/**
 * Keep in sync with the web component definitions at static/library/*component.ts
 * and integration tests at server/webdriver/shared.py
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "datacommons-bar": BarComponentProps;
      "datacommons-gauge": GaugeComponentProps;
      "datacommons-highlight": HighlightComponentProps;
      "datacommons-line": LineComponentProps;
      "datacommons-map": MapComponentProps;
      "datacommons-pie": PieComponentProps;
      "datacommons-ranking": RankingComponentProps;
      "datacommons-slider": SliderComponentProps;
      "datacommons-text": TextComponentProps;
      "datacommons-scatter": ScatterComponentProps;
    }
  }
}
