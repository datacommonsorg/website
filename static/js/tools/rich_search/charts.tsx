/**
 * Copyright 2021 Google LLC
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

import _ from "lodash";
import React, { memo } from "react";

import { CachedChoroplethData, GeoJsonData, PageData } from "../../chart/types";
import { ChartBlock } from "../../place/chart_block";
import { isPlaceInUsa } from "../../place/util";

export interface ChartsPropType {
  places: string[];
  pageData: PageData;
  placeTypes: { [key: string]: string };
}

function Charts({ places, pageData, placeTypes }: ChartsPropType): JSX.Element {
  // TODO: Remove the hardcoded category.
  const category = "Health";
  const categoryData = pageData.pageChart[category];
  const locale = document.getElementById("locale").dataset.lc;
  const dcid = places[0];
  const blocks = _.flatten(Object.values(categoryData));
  return (
    <section className="block col-12">
      <div className="row row-cols-xl-3 row-cols-md-2 row-cols-1">
        {blocks.map((data) => (
          <ChartBlock
            key={data.title}
            dcid={dcid}
            placeName={pageData.names[dcid]}
            placeType={placeTypes[dcid]}
            geoJsonData={Promise.resolve(null)}
            choroplethData={Promise.resolve({})}
            isUsaPlace={isPlaceInUsa(dcid, pageData.parentPlaces)}
            names={pageData.names}
            data={data}
            locale={locale}
            childPlaceType={pageData.childPlacesType}
            parentPlaces={pageData.parentPlaces}
            category={category}
            doUpdatePageLayoutState={false}
          />
        ))}
      </div>
    </section>
  );
}

export const MemoCharts = memo(Charts);
